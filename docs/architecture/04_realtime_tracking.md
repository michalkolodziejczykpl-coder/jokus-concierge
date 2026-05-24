# Śledzenie jokusora na mapie — architektura

## Wymaganie biznesowe

Mieszkaniec po opłaceniu zamówienia ma widzieć na mapie:

1. Aktualną pozycję jokusora (update co 5-10 sekund)
2. Trasę z punktu A (jokusor) przez B (np. sklep) do C (adres mieszkańca)
3. ETA — szacowany czas przybycia, aktualizowany co update

Czyli „jak Uber/Bolt".

## Wyzwania techniczne

1. **Bateria jokusora** — wysyłanie GPS co 5s przez godzinę zżera ~20% baterii. Trzeba zoptymalizować.
2. **Skala** — 100 jokusorów × 720 update'ów/godz × 10 godz/dzień = **720 000 zdarzeń dziennie**. Przy 1000 jokusorach: 7.2M. Postgres tego nie wytrzyma jako write-heavy table.
3. **Latencja** — od momentu wysłania GPS przez jokusora do wyświetlenia na mapie mieszkańca ma być <2 sekundy.
4. **Konflikt z RODO** — nie możemy trzymać surowych logów GPS bez celu.

## Rozwiązanie: dwa kanały danych

### Kanał A: Live broadcast (efemeryczny)

- Supabase Realtime Broadcast (channel-based WebSocket)
- Nie zapisujemy w bazie — przekazujemy P2P
- Mieszkaniec subskrybuje `tracking:order:{order_id}`
- Jokusor publikuje do tego samego kanału
- TTL: życie sesji (gdy mieszkaniec zamyka aplikację, kanał się zwija)

```typescript
// Jokusor — publikuje
const channel = supabase.channel(`tracking:order:${orderId}`);
await channel.subscribe();

setInterval(async () => {
  const pos = await getCurrentPosition();
  channel.send({
    type: 'broadcast',
    event: 'location',
    payload: {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      ts: Date.now()
    }
  });
}, 7000); // co 7 sekund — sweet spot bateria vs UX
```

```typescript
// Mieszkaniec — subskrybuje
const channel = supabase.channel(`tracking:order:${orderId}`);
channel.on('broadcast', { event: 'location' }, (payload) => {
  updateMarkerPosition(payload);
  recalculateETA(payload);
});
await channel.subscribe();
```

### Kanał B: Checkpoint events (persistent)

- Zapisujemy w bazie tylko **kluczowe punkty**:
  - `accepted` — jokusor zaakceptował zlecenie
  - `started` — wyjechał z punktu startowego
  - `arrived_pickup` — dotarł do punktu odbioru (np. sklepu)
  - `pickup_complete` — zakończył odbiór (np. kupił zakupy)
  - `arrived_destination` — dotarł pod adres mieszkańca
  - `completed` — zlecenie zakończone

- Tabela `order_events` (insert-only, partycjonowana po miesiącu)
- Mała ilość rekordów (6-8 na zamówienie zamiast 720)
- Wykorzystywana do historii i reklamacji

```sql
CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  event_type text NOT NULL,
  location geography(POINT, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

## Throttling po stronie jokusora

Zamiast wysyłać GPS co 7s niezależnie od warunków, aplikacja jokusora optymalizuje:

```typescript
// Pseudo-kod
function shouldBroadcast(prev, curr) {
  const dist = haversine(prev, curr);
  const timeSince = Date.now() - prev.ts;

  // Jeśli stoi w miejscu (np. korek) — wysyłaj rzadziej
  if (dist < 20 && timeSince < 30_000) return false;

  // Jeśli na trasie — normalnie
  if (timeSince >= 7_000) return true;

  // Jeśli dramatyczna zmiana (zjazd z trasy) — natychmiast
  if (isOffRoute(curr)) return true;

  return false;
}
```

To redukuje liczbę broadcastów o ~40% bez utraty UX.

## ETA — kalkulacja

ETA liczona po stronie klienta mieszkańca (oszczędza requesty), z fallback do Mapbox Directions API.

### Tryb prosty (default)

```typescript
function calculateETA(jokusorPos, destination) {
  const distMeters = haversine(jokusorPos, destination);
  // Średnia prędkość w mieście: 30 km/h = 8.33 m/s
  // Konserwatywnie: 6 m/s (uwzględnia światła, korki)
  const secondsRemaining = distMeters / 6;
  return new Date(Date.now() + secondsRemaining * 1000);
}
```

Działa dla 90% przypadków, błąd ±3 minuty.

### Tryb dokładny (po odpaleniu Directions API)

Co 60 sekund:

```typescript
const route = await mapbox.directions({
  profile: 'driving',
  coordinates: [jokusorPos, destination]
});
const eta = new Date(Date.now() + route.duration * 1000);
```

Koszt: 1 request/min × 60 min × 100 jokusorów = 6000 requestów/dzień = $3/dzień = ~$90/mies przy 100 jokusorach.

### Decyzja

**Start: tryb prosty** (haversine), bez kosztu API. Po MVP — A/B test, czy tryb dokładny zwiększa satysfakcję.

## Trasa na mapie

Trasa pokazywana **statycznie** po zaakceptowaniu zlecenia:

```typescript
// Po akceptacji zlecenia — backend pobiera trasę
const route = await mapbox.directions({
  coordinates: [
    jokusorStartingPoint,
    ...(orderType === 'shopping' ? [shopLocation] : []),
    residentAddress
  ]
});

// Zapisujemy GeoJSON LineString w orders.planned_route (JSONB)
await supabase
  .from('orders')
  .update({
    planned_route: route.geometry,
    planned_duration: route.duration
  })
  .eq('id', orderId);
```

Mieszkaniec widzi tę linię na mapie statycznie. Marker jokusora porusza się po niej (lub obok niej, jeśli zboczy z trasy).

## Bezpieczeństwo i prywatność

### RODO

- **Surowe pozycje GPS nie są zapisywane.** Tylko checkpoint events.
- Po zakończeniu zamówienia kanał broadcast jest zamykany.
- Dane historyczne (checkpoints) retencja: 24 miesiące, potem soft-delete.
- Możliwość eksportu i usunięcia danych (RODO art. 15, 17).

### Bezpieczeństwo kanału

- RLS policy na kanale `tracking:order:{id}`: subskrybować mogą tylko:
  - Mieszkaniec danego zamówienia
  - Jokusor przypisany do zamówienia
  - Admin (audyt)
- Inne osoby dostają 403 przy próbie subscribe.

```sql
-- Realtime Authorization (Supabase)
CREATE POLICY "tracking_subscribe" ON realtime.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = (regexp_split_to_array(topic, ':'))[3]::uuid
        AND (o.resident_id = auth.uid() OR o.jokusor_id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

## Fallback offline

Jeśli jokusor traci internet:

- Aplikacja buforuje pozycje w IndexedDB
- Przy odzyskaniu sieci wysyła jednym batch'em (z timestampami)
- Mieszkaniec widzi: ostatnia znana pozycja + ikona „brak sygnału" + szacowany czas

## Tracking w aplikacji RN (etap 2)

W aplikacji natywnej (Expo) używamy `expo-location` z `Location.startLocationUpdatesAsync()`:

- Background tracking (działa przy zablokowanym ekranie)
- Wymaga uprawnienia „Always Allow" — UX flow z dobrym wyjaśnieniem dla użytkownika
- Battery-friendly: system OS optymalizuje sampling

W PWA fallback: tylko foreground tracking (gdy aplikacja otwarta).
