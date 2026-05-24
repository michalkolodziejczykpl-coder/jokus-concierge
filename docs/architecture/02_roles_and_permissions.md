# Role i uprawnienia

## Model RBAC (Role-Based Access Control)

Cztery role, hierarchia uprawnień rosnąco:

```
guest < resident < jokusor < admin
```

Role są zapisane w `public.users.role` jako enum:

```sql
CREATE TYPE user_role AS ENUM ('resident', 'jokusor', 'admin');
```

Gość = brak rekordu w `public.users` (tylko sesja anonimowa lub niezarejestrowany).

## Rola: Admin (Michał)

**Cel:** zarządzanie całą siecią MIGMIG.

### Może:

- Włączać/wyłączać moduły usług (globalnie lub per osiedle)
- Definiować osiedla (rysować poligony na mapie Polski)
- Akceptować/odrzucać wnioski jokusorów (onboarding)
- Czytać wszystkie tabele bez wyjątku (read-all)
- Modyfikować cenniki bazowe modułów
- Konfigurować model rozliczeniowy per jokusor (abonament/prowizja/hybryda)
- Akceptować propozycje nowych modułów od mieszkańców
- Rozstrzygać reklamacje i spory
- Suspendować/usuwać konta jokusorów i mieszkańców (z odpowiednim audit log)
- Eksportować dane do PIT/CIT/JPK_FA
- Przeglądać agregowane statystyki (GMV, DAU, NPS, churn)

### Nie może:

- Składać zamówień jako mieszkaniec (osobne konto jeśli chce testować)
- Modyfikować ocen i napiwków post factum (tylko ukrywać przy reklamacji)
- Zmieniać historii płatności (audit trail jest write-once)

### Ile kont admin?

Na start jedno (Michał). Tabela `users` przewiduje rozszerzenie o `admin_scope` (np. „region: Dolnośląskie") na przyszłość.

## Rola: Jokusor

**Cel:** świadczenie usług na swoim osiedlu pod marką MIGMIG.

### Może:

- Akceptować/odrzucać przydzielone zlecenia (5 min na odpowiedź)
- Zarządzać własnym kalendarzem (godziny pracy, urlopy, dni wolne)
- **Definiować zasięg geograficzny swoich usług** (polygon na mapie LUB lista kodów pocztowych / ulic)
- Wysyłać aktualizację swojego GPS podczas realizacji zlecenia
- Komunikować się z mieszkańcem w czacie zamówienia
- Pobierać własne faktury (od JOKUS Sp. z o.o.) i własne statystyki
- Wnioskować o aktywację dodatkowych modułów dla swojego osiedla
- Modyfikować ceny w widełkach ustalonych przez admina (np. ± 20%)

### Nie może:

- Wybierać klientów (system przydziela na podstawie slotów + lokalizacji)
- Widzieć danych innych jokusorów (poza publiczną oceną w rankingu)
- Bezpośrednio kontaktować się z mieszkańcami poza systemem (regulamin franczyzy zakazuje)
- Modyfikować swoich ocen (oceny są write-once po zatwierdzeniu)
- Wyłączyć modułu globalnie — tylko dla siebie ("nie przyjmuję tego typu zleceń")

### Ograniczenia operacyjne:

- Maksymalna liczba równoczesnych zleceń: 1 (singiel) lub konfigurowalne (zespół)
- Maksymalny czas reakcji na nowe zlecenie: 5 minut
- Automatyczne odrzucenie (przekazanie do innego jokusora) po przekroczeniu

## Rola: Resident (Mieszkaniec)

**Cel:** zamawianie usług, kupowanie/sprzedawanie na marketplace.

### Może:

- Składać zamówienia w modułach włączonych dla jego osiedla
- Wystawiać ogłoszenia na mini-marketplace (limit 10 aktywnych)
- Kupować z marketplace + zamawiać dostawę MIGMIG kuriera
- Płacić (BLIK, karta, w przyszłości portfel MIGMIG)
- Oceniać jokusora i dawać napiwki po zakończeniu zlecenia
- Czatować z jokusorem podczas trwania zlecenia
- Proponować nowe moduły (np. „brakuje mi mycia okien")
- Polecać znajomych (program poleceń)
- Eksportować swoje dane (RODO)
- Usunąć swoje konto (z grace period 30 dni)

### Nie może:

- Widzieć danych innych mieszkańców
- Kontaktować się bezpośrednio z jokusorem poza systemem
- Modyfikować ocen po zatwierdzeniu
- Zmieniać ceny zamówionej usługi

### Adres mieszkańca

Mieszkaniec może mieć wiele adresów (dom, biuro, dom rodziców) ale jeden „domyślny". System weryfikuje, czy adres jest w obsługiwanej strefie zanim pokaże kafelki modułów.

## Tabela uprawnień — quick reference

| Akcja                       | Resident             | Jokusor            | Admin         |
| --------------------------- | -------------------- | ------------------ | ------------- |
| Złóż zamówienie             | ✓ (swoje)            | –                  | –             |
| Akceptuj zamówienie         | –                    | ✓ (przydzielone)   | –             |
| Czytaj zamówienie           | ✓ (swoje)            | ✓ (swoje)          | ✓ (wszystkie) |
| Modyfikuj zamówienie        | ✓ (status `draft`)   | ✓ (status changes) | ✓             |
| Anuluj zamówienie           | ✓ (przed `accepted`) | ✓ (z karą)         | ✓ (bez kary)  |
| Włącz/wyłącz moduł          | –                    | –                  | ✓             |
| Definiuj zasięg jokusora    | –                    | ✓ (swój)           | ✓ (każdy)     |
| Wyślij GPS                  | –                    | ✓ (podczas zlec.)  | –             |
| Subskrybuj live tracking    | ✓ (swoje zlec.)      | ✓ (swoje)          | ✓ (wszystkie) |
| Wystaw ogłoszenie           | ✓                    | ✓                  | –             |
| Zamów dostawę z marketplace | ✓                    | ✓                  | –             |
| Oceń jokusora               | ✓ (raz/zlec.)        | –                  | –             |
| Daj napiwek                 | ✓                    | –                  | –             |
| Propozycja modułu           | ✓                    | ✓                  | –             |
| Akceptuj propozycję         | –                    | –                  | ✓             |
| Eksport JPK_FA              | –                    | –                  | ✓             |

## Implementacja w kodzie

### Middleware (Next.js)

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin') && user?.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (pathname.startsWith('/dashboard') && user?.app_metadata?.role !== 'jokusor') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  // ...
  return response;
}
```

### RLS (Row Level Security)

Wszystkie tabele mają włączone RLS. Polityki w `docs/database/02_rls_policies.sql`.

Przykład:

```sql
-- Mieszkaniec widzi tylko swoje zamówienia
CREATE POLICY "residents_read_own_orders" ON orders
  FOR SELECT USING (resident_id = auth.uid());

-- Jokusor widzi tylko zamówienia przydzielone do niego
CREATE POLICY "jokusors_read_assigned_orders" ON orders
  FOR SELECT USING (jokusor_id = auth.uid());

-- Admin widzi wszystko
CREATE POLICY "admin_read_all_orders" ON orders
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```
