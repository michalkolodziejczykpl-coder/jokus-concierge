# Zadanie dla Claude Code — wizualne wzbogacenie sklepu (ikony kategorii + plakietki promo)

## Cel

Tani, duży efekt wizualny w `/sklep`, inspirowany lisek.app, BEZ przeładowania UI:

1. ikona kategorii jako sensowny placeholder, gdy produkt nie ma zdjęcia (dziś jest goła ikona ImageOff — wygląda na zepsute);
2. ikony przy kafelkach/filtrach kategorii;
3. plakietka na karcie produktu: „Hit" lub „‑X%"/„Promo", z ceną przekreśloną gdy jest cena „przed".

Zakres celowo mały — to ma być największy efekt najmniejszym nakładem. Reszta UI sklepu zostaje.

## 1. Migracja DB — pola promocyjne na produkcie

Nowa migracja `supabase/migrations/2026XXXXXXXXXX_product_promo_fields.sql` (data > 20260620000002), idempotentna:

```sql
alter table products add column if not exists old_price numeric(10,2) check (old_price is null or old_price >= 0);
alter table products add column if not exists badge text; -- 'hit' | 'promo' | null
```

`old_price` = cena „przed" (przekreślona). `badge` = ręczna plakietka. Procent zniżki liczymy w UI z `old_price` vs `estimated_price` (nie trzymamy go w bazie).
(Właściciel wgra tę migrację ręcznie w SQL Editorze — dopisz to w opisie commita.)

## 2. validators.ts — rozszerz `productSchema`

Dodaj opcjonalne pola:

- `old_price`: `z.coerce.number().min(0).max(100000).optional()` (puste = null);
- `badge`: `z.enum(['hit', 'promo']).optional().or(z.literal(''))`.

## 3. Admin `ProductForm.tsx` — dwa nowe pola

Dodaj w formularzu produktu (`src/components/admin/ProductForm.tsx`):

- „Cena przed (opcjonalnie)" → `old_price`;
- „Plakietka" → select: brak / „Hit" (`hit`) / „Promocja" (`promo`).
  Prześlij je w body do `/api/admin/products` (POST i PATCH). Rozszerz odpowiednio route'y `src/app/api/admin/products/route.ts` i `[id]/route.ts` o zapis tych pól (walidacja Zod po stronie serwera).

## 4. Sklep `Shop.tsx` — ikony i plakietki

Plik: `src/components/resident/Shop.tsx`. Typy `Product`/`Category` dostają nowe pola (`old_price`, `badge`; kategoria → `slug`). Strona `/sklep` (`src/app/(resident)/sklep/page.tsx`) musi je dociągnąć w selectach (`products`: dodaj `old_price, badge, category_id`; `product_categories`: dodaj `slug`).

Mapowanie slug → ikona lucide (stwórz mały helper, np. `categoryIcon(slug)`):

```
pieczywo→Croissant, nabial-jaja→Milk, mieso-drob→Drumstick, wedliny→Ham,
ryby→Fish, owoce→Apple, warzywa→Carrot, mrozonki→Snowflake,
spizarnia→Wheat, konserwy→Archive, sosy-przyprawy→Soup, slodycze→Candy,
przekaski→Cookie, napoje→CupSoda, kawa-herbata→Coffee, alkohol→Wine,
dla-dziecka→Baby, higiena→ShowerHead, chemia→SprayCan, dla-zwierzat→PawPrint
```

(Jeśli któraś ikona nie istnieje w zainstalowanej wersji lucide-react — podmień na najbliższą dostępną; fallback: `ShoppingBasket`.)

Na karcie produktu:

- **placeholder zdjęcia:** gdy brak `image_url`, zamiast samego ImageOff pokaż ikonę kategorii (duża, wyśrodkowana, na delikatnym tle) — karta wygląda „pełna", nie zepsuta;
- **plakietka (lewy górny róg):** jeśli `old_price > estimated_price` → `‑{round((1 - price/old_price)*100)}%` (czerwone tło); w przeciwnym razie jeśli `badge==='hit'` → „Hit", `badge==='promo'` → „Promo". Serduszko‑ulubione zostaje w PRAWYM górnym rogu (nie kolidować);
- **cena:** gdy `old_price > estimated_price`, pokaż starą cenę przekreśloną (mniejsza, szara) obok aktualnej.

Przy pasku/filtrach kategorii dodaj ikonę kategorii obok nazwy (mały akcent, spójny z resztą).

## Uwagi

- Next 16: `cookies()` async w komponentach serwerowych — `await`.
- UI po polsku, kod po angielsku; 2 spacje, single quotes, brak trailing comma.
- Nie ruszać logiki koszyka/ulubionych/checkoutu — tylko warstwa wizualna + 2 pola DB.
- Brak `image_url` ma wyglądać dobrze (ikona kategorii), bo seed produktów nie ma zdjęć.

## Bramka jakości przed commitem

```
npm run typecheck
npm run format
```

Potem commit + push na `main`. W opisie commita przypomnij właścicielowi o ręcznym wgraniu migracji `*_product_promo_fields.sql` w Supabase SQL Editor.
