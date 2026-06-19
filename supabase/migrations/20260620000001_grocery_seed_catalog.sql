-- Seed: starter grocery catalog (trimmed). A full department structure with ONE
-- generic representative per product type, all priced 0.01 PLN as placeholders.
-- Intended to be SWAPPED for real products later — names are deliberately generic
-- (Bułka, Majonez, Chipsy …). Idempotent: safe to re-run (categories upsert by
-- slug; products skip if a same-named product already exists in that category).

-- ---------------------------------------------------------------------------
-- Categories (departments)
-- ---------------------------------------------------------------------------
insert into product_categories (name, slug, sort_order) values
  ('Pieczywo', 'pieczywo', 10),
  ('Nabiał i jaja', 'nabial-jaja', 20),
  ('Mięso i drób', 'mieso-drob', 30),
  ('Wędliny', 'wedliny', 40),
  ('Ryby i owoce morza', 'ryby', 50),
  ('Owoce', 'owoce', 60),
  ('Warzywa', 'warzywa', 70),
  ('Mrożonki', 'mrozonki', 80),
  ('Artykuły sypkie i spiżarnia', 'spizarnia', 90),
  ('Konserwy i przetwory', 'konserwy', 100),
  ('Sosy i przyprawy', 'sosy-przyprawy', 110),
  ('Słodycze', 'slodycze', 120),
  ('Przekąski', 'przekaski', 130),
  ('Napoje', 'napoje', 140),
  ('Kawa i herbata', 'kawa-herbata', 150),
  ('Alkohol', 'alkohol', 160),
  ('Dla dziecka', 'dla-dziecka', 170),
  ('Higiena i kosmetyki', 'higiena', 180),
  ('Chemia gospodarcza', 'chemia', 190),
  ('Dla zwierząt', 'dla-zwierzat', 200)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products: one generic representative per type, all 0.01 PLN.
-- ---------------------------------------------------------------------------
with seed(cat_slug, name, unit, sort_order) as (
  values
    -- Pieczywo
    ('pieczywo', 'Bułka', 'szt.', 10),
    ('pieczywo', 'Bułka kajzerka', 'szt.', 20),
    ('pieczywo', 'Bułka grahamka', 'szt.', 30),
    ('pieczywo', 'Chleb', 'szt.', 40),
    ('pieczywo', 'Chleb tostowy', 'szt.', 50),
    ('pieczywo', 'Bagietka', 'szt.', 60),
    ('pieczywo', 'Rogal', 'szt.', 70),
    ('pieczywo', 'Drożdżówka', 'szt.', 80),

    -- Nabiał i jaja
    ('nabial-jaja', 'Mleko', 'l', 10),
    ('nabial-jaja', 'Masło', 'szt.', 20),
    ('nabial-jaja', 'Margaryna', 'szt.', 30),
    ('nabial-jaja', 'Ser żółty', 'kg', 40),
    ('nabial-jaja', 'Twaróg', 'szt.', 50),
    ('nabial-jaja', 'Serek wiejski', 'szt.', 60),
    ('nabial-jaja', 'Jogurt naturalny', 'szt.', 70),
    ('nabial-jaja', 'Jogurt owocowy', 'szt.', 80),
    ('nabial-jaja', 'Śmietana', 'szt.', 90),
    ('nabial-jaja', 'Kefir', 'szt.', 100),
    ('nabial-jaja', 'Jaja', 'opak.', 110),

    -- Mięso i drób
    ('mieso-drob', 'Filet z kurczaka', 'kg', 10),
    ('mieso-drob', 'Udko z kurczaka', 'kg', 20),
    ('mieso-drob', 'Filet z indyka', 'kg', 30),
    ('mieso-drob', 'Mięso mielone', 'kg', 40),
    ('mieso-drob', 'Schab', 'kg', 50),
    ('mieso-drob', 'Karkówka', 'kg', 60),
    ('mieso-drob', 'Żeberka', 'kg', 70),

    -- Wędliny
    ('wedliny', 'Szynka', 'kg', 10),
    ('wedliny', 'Polędwica', 'kg', 20),
    ('wedliny', 'Kiełbasa', 'kg', 30),
    ('wedliny', 'Parówki', 'opak.', 40),
    ('wedliny', 'Boczek', 'kg', 50),
    ('wedliny', 'Salami', 'kg', 60),
    ('wedliny', 'Kabanos', 'opak.', 70),
    ('wedliny', 'Pasztet', 'szt.', 80),

    -- Ryby i owoce morza
    ('ryby', 'Filet rybny', 'kg', 10),
    ('ryby', 'Łosoś', 'kg', 20),
    ('ryby', 'Śledź', 'opak.', 30),
    ('ryby', 'Makrela wędzona', 'szt.', 40),
    ('ryby', 'Paluszki rybne', 'opak.', 50),
    ('ryby', 'Krewetki', 'opak.', 60),

    -- Owoce
    ('owoce', 'Jabłko', 'kg', 10),
    ('owoce', 'Banan', 'kg', 20),
    ('owoce', 'Pomarańcza', 'kg', 30),
    ('owoce', 'Mandarynka', 'kg', 40),
    ('owoce', 'Cytryna', 'kg', 50),
    ('owoce', 'Gruszka', 'kg', 60),
    ('owoce', 'Winogrono', 'kg', 70),
    ('owoce', 'Kiwi', 'szt.', 80),
    ('owoce', 'Truskawki', 'opak.', 90),

    -- Warzywa
    ('warzywa', 'Ziemniaki', 'kg', 10),
    ('warzywa', 'Pomidor', 'kg', 20),
    ('warzywa', 'Ogórek', 'kg', 30),
    ('warzywa', 'Cebula', 'kg', 40),
    ('warzywa', 'Marchew', 'kg', 50),
    ('warzywa', 'Papryka', 'kg', 60),
    ('warzywa', 'Sałata', 'szt.', 70),
    ('warzywa', 'Brokuł', 'szt.', 80),
    ('warzywa', 'Czosnek', 'szt.', 90),
    ('warzywa', 'Pieczarki', 'opak.', 100),

    -- Mrożonki
    ('mrozonki', 'Mrożone warzywa', 'opak.', 10),
    ('mrozonki', 'Frytki', 'opak.', 20),
    ('mrozonki', 'Pizza mrożona', 'szt.', 30),
    ('mrozonki', 'Pierogi mrożone', 'opak.', 40),
    ('mrozonki', 'Mrożone owoce', 'opak.', 50),
    ('mrozonki', 'Lody', 'opak.', 60),

    -- Artykuły sypkie i spiżarnia
    ('spizarnia', 'Mąka', 'kg', 10),
    ('spizarnia', 'Cukier', 'kg', 20),
    ('spizarnia', 'Sól', 'opak.', 30),
    ('spizarnia', 'Ryż', 'opak.', 40),
    ('spizarnia', 'Makaron', 'opak.', 50),
    ('spizarnia', 'Kasza', 'opak.', 60),
    ('spizarnia', 'Płatki owsiane', 'opak.', 70),
    ('spizarnia', 'Płatki śniadaniowe', 'opak.', 80),
    ('spizarnia', 'Olej', 'l', 90),
    ('spizarnia', 'Ocet', 'szt.', 100),

    -- Konserwy i przetwory
    ('konserwy', 'Tuńczyk w puszce', 'szt.', 10),
    ('konserwy', 'Kukurydza konserwowa', 'szt.', 20),
    ('konserwy', 'Groszek konserwowy', 'szt.', 30),
    ('konserwy', 'Fasola konserwowa', 'szt.', 40),
    ('konserwy', 'Pomidory w puszce', 'szt.', 50),
    ('konserwy', 'Koncentrat pomidorowy', 'szt.', 60),

    -- Sosy i przyprawy
    ('sosy-przyprawy', 'Ketchup', 'szt.', 10),
    ('sosy-przyprawy', 'Majonez', 'szt.', 20),
    ('sosy-przyprawy', 'Musztarda', 'szt.', 30),
    ('sosy-przyprawy', 'Sos sojowy', 'szt.', 40),
    ('sosy-przyprawy', 'Przyprawa uniwersalna', 'szt.', 50),
    ('sosy-przyprawy', 'Pieprz', 'szt.', 60),
    ('sosy-przyprawy', 'Zioła suszone', 'szt.', 70),
    ('sosy-przyprawy', 'Kostka rosołowa', 'opak.', 80),

    -- Słodycze
    ('slodycze', 'Czekolada', 'szt.', 10),
    ('slodycze', 'Baton', 'szt.', 20),
    ('slodycze', 'Wafelek', 'szt.', 30),
    ('slodycze', 'Ciastka', 'opak.', 40),
    ('slodycze', 'Cukierki', 'opak.', 50),
    ('slodycze', 'Żelki', 'opak.', 60),
    ('slodycze', 'Guma do żucia', 'szt.', 70),

    -- Przekąski
    ('przekaski', 'Chipsy', 'opak.', 10),
    ('przekaski', 'Paluszki', 'opak.', 20),
    ('przekaski', 'Krakersy', 'opak.', 30),
    ('przekaski', 'Orzeszki', 'opak.', 40),
    ('przekaski', 'Popcorn', 'opak.', 50),
    ('przekaski', 'Precle', 'opak.', 60),
    ('przekaski', 'Chrupki', 'opak.', 70),

    -- Napoje
    ('napoje', 'Woda', 'l', 10),
    ('napoje', 'Woda smakowa', 'l', 20),
    ('napoje', 'Sok', 'l', 30),
    ('napoje', 'Nektar', 'l', 40),
    ('napoje', 'Napój gazowany', 'l', 50),
    ('napoje', 'Napój energetyczny', 'szt.', 60),

    -- Kawa i herbata
    ('kawa-herbata', 'Kawa mielona', 'opak.', 10),
    ('kawa-herbata', 'Kawa rozpuszczalna', 'szt.', 20),
    ('kawa-herbata', 'Herbata czarna', 'opak.', 30),
    ('kawa-herbata', 'Herbata ziołowa', 'opak.', 40),
    ('kawa-herbata', 'Kakao', 'opak.', 50),

    -- Alkohol (18+)
    ('alkohol', 'Piwo', 'szt.', 10),
    ('alkohol', 'Wino', 'szt.', 20),
    ('alkohol', 'Wódka', 'szt.', 30),
    ('alkohol', 'Whisky', 'szt.', 40),

    -- Dla dziecka
    ('dla-dziecka', 'Pieluchy', 'opak.', 10),
    ('dla-dziecka', 'Chusteczki nawilżane', 'opak.', 20),
    ('dla-dziecka', 'Kaszka', 'opak.', 30),
    ('dla-dziecka', 'Mleko modyfikowane', 'opak.', 40),
    ('dla-dziecka', 'Słoiczek', 'szt.', 50),

    -- Higiena i kosmetyki
    ('higiena', 'Papier toaletowy', 'opak.', 10),
    ('higiena', 'Ręcznik papierowy', 'opak.', 20),
    ('higiena', 'Chusteczki higieniczne', 'opak.', 30),
    ('higiena', 'Pasta do zębów', 'szt.', 40),
    ('higiena', 'Mydło', 'szt.', 50),
    ('higiena', 'Szampon', 'szt.', 60),
    ('higiena', 'Dezodorant', 'szt.', 70),

    -- Chemia gospodarcza
    ('chemia', 'Płyn do naczyń', 'szt.', 10),
    ('chemia', 'Proszek do prania', 'opak.', 20),
    ('chemia', 'Płyn do podłóg', 'szt.', 30),
    ('chemia', 'Płyn uniwersalny', 'szt.', 40),
    ('chemia', 'Worki na śmieci', 'opak.', 50),
    ('chemia', 'Gąbki kuchenne', 'opak.', 60),

    -- Dla zwierząt
    ('dla-zwierzat', 'Karma dla psa', 'opak.', 10),
    ('dla-zwierzat', 'Karma dla kota', 'opak.', 20),
    ('dla-zwierzat', 'Żwirek dla kota', 'opak.', 30)
)
insert into products (category_id, name, unit, estimated_price, sort_order)
select c.id, s.name, s.unit, 0.01, s.sort_order
from seed s
join product_categories c on c.slug = s.cat_slug
where not exists (
  select 1 from products p where p.category_id = c.id and p.name = s.name
);
