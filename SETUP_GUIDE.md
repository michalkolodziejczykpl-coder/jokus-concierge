# JOKUS Concierge — przewodnik setup krok po kroku

Zakładam: Windows, zero doświadczenia z Next.js/Supabase. Każdy krok ma "gdzie wejść / co kliknąć". Czas całkowity: 2–4 godziny rozłożone na dzień.

---

## CZĘŚĆ A — Środowisko na komputerze (40 min)

### A1. Node.js (silnik, na którym chodzi cała aplikacja)

1. Wejdź na **https://nodejs.org**
2. Ściągnij **LTS** (po lewej, z napisem "Recommended For Most Users"). Powinno to być Node 20.x.
3. Uruchom instalator → klikaj "Next" do końca. **Zaznacz** opcję "Automatically install the necessary tools" (zainstaluje też potrzebne narzędzia).
4. Otwórz **PowerShell** (Win+R → wpisz `powershell` → Enter) i sprawdź:
   ```powershell
   node --version
   npm --version
   ```
   Powinno pokazać `v20.x.x` i `10.x.x`. Jeśli nie — zrestartuj PowerShell.

### A2. Git (system kontroli wersji, wymagany przez Vercel i Claude Code)

1. Wejdź na **https://git-scm.com/download/win**
2. Ściągnij i uruchom instalator → klikaj "Next" wszędzie, **jedyna ważna zmiana**: na ekranie "Adjusting your PATH environment" wybierz drugą opcję ("Git from the command line and also from 3rd-party software"). Reszta domyślnie.
3. W PowerShell:
   ```powershell
   git --version
   git config --global user.name "Michał Kołodziejczyk"
   git config --global user.email "michal.kolodziejczyk.pl@gmail.com"
   ```

### A3. VS Code (edytor — najprostszy do Next.js)

1. Wejdź na **https://code.visualstudio.com** → pobierz instalator.
2. Uruchom → **zaznacz** "Add to PATH" i "Add 'Open with Code' action to file context menu". Reszta domyślnie.
3. Po instalacji otwórz VS Code → klawisz `Ctrl+Shift+X` (rozszerzenia) i zainstaluj:
   - **ESLint** (Microsoft)
   - **Prettier — Code formatter** (Prettier)
   - **Tailwind CSS IntelliSense** (Tailwind Labs)
   - **TypeScript** (już jest wbudowany, ale upewnij się że jest aktualny)

### A4. (opcjonalne, ale rekomendowane) Cursor zamiast VS Code

Cursor to fork VS Code z wbudowaną integracją Claude. Wszystkie kroki wyżej działają identycznie — ściągnij z **https://cursor.sh**.

---

## CZĘŚĆ B — Uruchomienie projektu lokalnie (15 min)

### B1. Instalacja zależności

1. Otwórz PowerShell.
2. Przejdź do projektu:
   ```powershell
   cd C:\Projekty\jokusMigMig
   ```
3. Zainstaluj wszystko z `package.json`:
   ```powershell
   npm install
   ```
   Pierwsze uruchomienie trwa 2–5 minut. Pobierze ~300 MB do folderu `node_modules` (już dodanego do `.gitignore`).

### B2. Plik środowiskowy `.env.local`

1. Skopiuj szablon:
   ```powershell
   copy .env.example .env.local
   ```
2. Otwórz `.env.local` w VS Code (`code .env.local`). Na razie zostaw puste — wypełnimy po założeniu kont w częściach C–G.

### B3. Pierwszy test

Bez wypełnionych kluczy projekt się zbuduje, ale nie zaloguje. Sprawdźmy że TypeScript jest zielony:

```powershell
npx tsc --noEmit
```

Jeśli pokaże "0 errors" — wszystko OK. Jeśli błędy — zgłoś mi, zobaczymy.

---

## CZĘŚĆ C — Supabase (baza + auth + storage) (30 min)

### C1. Założenie konta i projektu

1. Wejdź na **https://supabase.com** → **Start your project** (prawy górny róg).
2. Zaloguj się przez **GitHub** (najwygodniej — Supabase i tak będzie się integrował z repo).
3. Po zalogowaniu kliknij **New project**:
   - **Name:** `migmig-concierge`
   - **Database Password:** WYGENERUJ silne hasło (przycisk "Generate a password") i **ZAPISZ JE W MENEDŻERZE HASEŁ**. Bez niego nie wejdziesz do bazy spoza Supabase.
   - **Region:** `Central EU (Frankfurt)` — najbliżej Polski, RODO-friendly.
   - **Pricing Plan:** Free (4 GB, 50 000 MAU — wystarczy na start).
4. Klik **Create new project**. Inicjalizacja trwa ~2 minuty (kawa).

### C2. Pobranie kluczy do `.env.local`

1. Po inicjalizacji w lewym menu kliknij ikonę koła zębatego (**Settings**) → **API**.
2. Skopiuj do `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ten klucz omija RLS, **nigdy** nie commituj go do gita.

### C3. Włączenie wymaganych rozszerzeń bazy

1. Settings → **Database** → **Extensions** (lewe submenu).
2. Wyszukaj i włącz (przełącznik na prawo):
   - `pgvector` — embeddings dla AI
   - `btree_gist` — gwarancja niekonfliktowych slotów
   - `postgis` — geografia (zasięg jokusorów)
   - `uuid-ossp` — generowanie UUID-ów
3. Każde "Enable" potwierdza modalem — klik OK.

### C4. Wykonanie migracji SQL

1. W lewym menu **SQL Editor** → **New query**.
2. Otwórz w VS Code plik `supabase/migrations/20260516000001_initial_schema.sql` → Ctrl+A → Ctrl+C.
3. Wklej do SQL Editor → klik **Run** (prawy dolny róg, lub Ctrl+Enter). Czekaj 10–30 s.
4. Powtórz dla `20260516000002_rls_policies.sql`.
5. (Opcjonalnie) Plik `20260516000003_seed_modules.sql` jest jeszcze szkieletem — wstawimy moduły później ręcznie albo przez panel admina.

### C5. Konfiguracja OAuth providerów

1. Authentication → **Providers** (lewe menu).
2. Włącz **Email** (już włączony domyślnie) i zaznacz "Confirm email" → OFF (magic link nie potrzebuje confirmation).
3. **Google** — odłóż na chwilę, najpierw zrobimy część D.

---

## CZĘŚĆ D — Google OAuth (15 min)

### D1. Google Cloud Console

1. Wejdź na **https://console.cloud.google.com** → zaloguj się tym samym kontem co aplikacja będzie używać (gmail.com OK).
2. Górna belka → menu wyboru projektu → **New Project**:
   - **Project name:** `JOKUS`
   - Klik **Create**, poczekaj 30 s, wybierz projekt z listy.

### D2. OAuth consent screen

1. Lewe menu → **APIs & Services** → **OAuth consent screen**.
2. **User Type:** External → **Create**.
3. Wypełnij:
   - **App name:** `JOKUS`
   - **User support email:** `michal.kolodziejczyk.pl@gmail.com`
   - **App logo:** możesz pominąć na start
   - **Application home page:** `https://jokus.pl` (na razie nie istnieje — to OK)
   - **Authorized domains:** dodaj `supabase.co` (Supabase trzyma callbacki)
   - **Developer contact:** ten sam email
4. **Save and Continue** → na ekranie "Scopes" tylko **Save and Continue** (domyślne wystarczą).
5. "Test users" → dodaj swój email (na czas dev). Save.

### D3. Credentials

1. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. **Application type:** Web application.
3. **Name:** `JOKUS Supabase`.
4. **Authorized redirect URIs:** wklej callback Supabase (znajdziesz go w Supabase: Authentication → Providers → Google → "Callback URL (for OAuth)" — wygląda np. `https://abcd1234.supabase.co/auth/v1/callback`).
5. **Create** → pojawi się modal z **Client ID** i **Client Secret** — skopiuj oba.

### D4. Podłączenie w Supabase

1. Supabase: Authentication → Providers → **Google** → przełącznik ON.
2. Wklej **Client ID** i **Client Secret** → Save.

---

## CZĘŚĆ E — Facebook OAuth (15 min, opcjonalne na start)

Jeśli chcesz na początek tylko Google — pomiń, wrócisz za miesiąc. Komponent `OAuthButtons` pokazuje wszystkie 3 przyciski, ale ich możesz ukryć aż do podłączenia.

### E1. Meta for Developers

1. **https://developers.facebook.com** → zaloguj się prywatnym kontem FB.
2. Górne menu → **My Apps** → **Create App**.
3. **Use case:** "Authenticate and request data from users with Facebook Login" → Next.
4. **App type:** Business → Next.
5. **App name:** `JOKUS`, **Contact email:** twój. → Create app (poprosi o hasło FB).

### E2. Facebook Login

1. W panelu aplikacji → "Add Products" → znajdź **Facebook Login** → **Set up**.
2. Platform: **Web** (na razie). Site URL: `https://jokus.pl` (placeholder).
3. Lewe menu: **Facebook Login → Settings**:
   - **Valid OAuth Redirect URIs:** ten sam callback co w Google (`https://abcd.supabase.co/auth/v1/callback`).
   - Save changes.
4. Lewe menu: **App settings → Basic**:
   - Skopiuj **App ID** i **App secret** (klik "Show", wpisz hasło FB).

### E3. Podłączenie w Supabase

1. Supabase: Authentication → Providers → **Facebook** → ON.
2. Wklej **App ID** i **App secret** → Save.

### E4. App review (przed produkcją)

Na czas dev Facebook pozwala tylko adminom aplikacji się logować. Aby uruchomić dla wszystkich, musisz przejść **App Review** — to robi się po pierwszym deploy, w sekcji "App Review → Permissions and Features" zgłaszasz `public_profile` i `email`. Trwa 2–7 dni.

---

## CZĘŚĆ F — Mapbox (mapy, geokodowanie, drawing) (10 min)

1. **https://account.mapbox.com/auth/signup** — załóż konto (email lub Google).
2. Po zalogowaniu jesteś od razu w panelu z **Default public token** — to Twój `NEXT_PUBLIC_MAPBOX_TOKEN`. Skopiuj go do `.env.local`.
3. (Opcjonalnie) Account → **Access tokens** → **Create a token**:
   - **Name:** `migmig-server` (do server-side calls jak Directions, Geocoding).
   - **Scopes:** zostaw publiczne + dodaj `MAPS:READ`, `NAVIGATION:READ`.
   - Skopiuj jako drugi token jeśli chcesz rozdzielić server/client (na MVP wystarczy jeden).
4. **Bezpłatne 50 000 map loads/miesiąc** + 100 000 geocodingów. Wystarczy na pierwsze setki użytkowników.

---

## CZĘŚĆ G — OpenAI (AI głosowe) (10 min)

Wprowadź dopiero przy Fazie 3 — w Fazach 0–2 jest niepotrzebne. Tutaj instrukcja "na zapas".

1. **https://platform.openai.com/signup** → konto (email lub Google).
2. Po zalogowaniu, prawy górny róg → profil → **View API keys** (lub https://platform.openai.com/api-keys).
3. **+ Create new secret key** → **Name:** `migmig-prod` → **Create**.
4. ⚠️ **Klucz pokazuje się TYLKO RAZ.** Skopiuj natychmiast do `.env.local` jako `OPENAI_API_KEY`.
5. Settings → **Billing** → dodaj kartę i kup minimum $5 kredytu (Whisper kosztuje $0.006/min audio — to ~14h nagrań za $5).

---

## CZĘŚĆ H — Przelewy24 (BLIK + karty) (20 min)

### H1. Konto sandbox (testowe, bez weryfikacji firmy)

1. **https://sandbox.przelewy24.pl/panel/** → **Zarejestruj się** (przycisk pod formularzem logowania).
2. Wypełnij formularz: dane firmy JOKUS Sp. z o.o., NIP 9131639730, adres, kontakt.
3. Czekaj na maila aktywacyjnego (5–60 min).

### H2. Pobranie kluczy

1. Po zalogowaniu: **Moje dane → Dane do integracji**.
2. Skopiuj do `.env.local`:
   - **ID Sprzedawcy** → `PRZELEWY24_MERCHANT_ID`
   - **Klucz do raportów** → `PRZELEWY24_REPORT_KEY`
   - **CRC** → `PRZELEWY24_CRC`
   - **Klucz API** → `PRZELEWY24_API_KEY`

### H3. Webhook URL (skonfigurujesz po pierwszym deploy)

W panelu Przelewy24: **Ustawienia → URL powiadomień**: `https://jokus.pl/api/webhooks/przelewy24` (na razie nieaktywne, wpiszesz po deploy do Vercel).

### H4. Przejście na produkcję

Wymaga: numer KRS, KRS firmy z CEIDG/KRS, regulamin sklepu, polityka prywatności, dane konta bankowego. Process potrwa 3–7 dni. Rób to po Fazie 1.

---

## CZĘŚĆ I — Vercel (hosting) (15 min)

### I1. Push do GitHuba

1. **https://github.com/new** → nowe repo: `migmig-concierge`, **Private**, bez README/gitignore (już mamy lokalnie). Klik Create.
2. W PowerShell w `C:\Projekty\jokusMigMig`:
   ```powershell
   git init
   git add .
   git commit -m "chore: initial scaffold from Cowork package"
   git branch -M main
   git remote add origin https://github.com/<twoj-login>/migmig-concierge.git
   git push -u origin main
   ```
3. Pierwszy push poprosi o login GitHuba (przeglądarka się otworzy).

### I2. Vercel deploy

1. **https://vercel.com/signup** → **Continue with GitHub** (autoryzacja).
2. Nowy projekt → **Import** obok `migmig-concierge`.
3. **Configure project:**
   - Framework Preset: Next.js (auto-wykryty).
   - **Environment Variables:** wklej zawartość `.env.local` ALE BEZ `NEXT_PUBLIC_APP_URL` (Vercel ustawi auto).
4. **Deploy** → pierwszy build trwa 1–3 min.
5. Po sukcesie dostajesz URL `migmig-concierge-xxx.vercel.app` — sprawdź czy się otwiera.

### I3. Domena jokus.pl

1. W Vercel projekt → **Settings → Domains** → wpisz `jokus.pl` → Add.
2. Vercel pokaże 2 rekordy DNS do dodania u rejestratora (A record + CNAME).
3. Wejdź do panelu Twojego rejestratora domeny (kto rejestrował jokus.pl?), znajdź sekcję DNS, dodaj rekordy. Propagacja: 15 min – 24 h.

---

## CZĘŚĆ J — Ikony PWA (10 min)

Aplikacja jako PWA potrzebuje ikon w `public/icons/`. Najszybciej:

1. **https://realfavicongenerator.net** lub **https://www.pwabuilder.com/imageGenerator**
2. Wrzuć logo JOKUS (kwadrat min 512×512 px, jeśli nie masz — na razie placeholder, np. **https://placehold.co/512x512/FF5A1F/FFFFFF.png?text=MM**).
3. Pobierz wygenerowany zestaw i wrzuć do `public/icons/`:
   - `icon-192.png` (192×192)
   - `icon-512.png` (512×512)
   - `icon-maskable.png` (512×512, z bezpiecznym marginesem)
   - `apple-touch-icon.png` (180×180)

---

## CZĘŚĆ K — Checklist końcowa

Wszystko powyżej zrobione? Sprawdź:

- [ ] `npm run dev` w `C:\Projekty\jokusMigMig` → otwiera się http://localhost:3000 z napisem "JOKUS Concierge"
- [ ] Klik "Zaloguj się" → "Kontynuuj z Google" → realny redirect do Google → po zalogowaniu wracasz na `/home` (na razie 404 to OK, ekran zbudujemy w Fazie 1)
- [ ] Supabase → Authentication → Users — widzisz swojego użytkownika
- [ ] Supabase → Table Editor → widzisz tabele `users`, `orders`, `modules`, itd. (~20 tabel)
- [ ] Repo na GitHub publikuje się, Vercel auto-deploy działa po push

Jeśli któryś punkt nie działa — wróć do tej sekcji w guidzie. Jeśli dalej blokuje — wklej mi błąd i ruszamy.

---

## CO DALEJ — kolejność prac (z roadmap)

| Faza                               | Czas                   | Co dostajesz na koniec                        |
| ---------------------------------- | ---------------------- | --------------------------------------------- |
| **0 — Setup**                      | 1–2 tyg (TERAZ)        | Ten guide ✓                                   |
| **1 — MVP mieszkańca**             | 6–8 tyg                | Można zamówić wyprowadzenie psa, BLIK, status |
| **2 — MVP jokusora**               | 3–4 tyg                | Franczyzobiorca przyjmuje zlecenia            |
| **3 — Live tracking + AI głosowe** | 3–4 tyg                | Uber-like mapa + komenda głosowa              |
| **4 — Marketplace C2C**            | 3–4 tyg                | Sprzedaż między sąsiadami z dostawą           |
| **5 — Professional**               | 2–3 tyg                | "Przypilnuj hydraulika"                       |
| **6 — Polish**                     | 4–6 tyg                | PWA offline, push, A/B, accessibility         |
| **7 — React Native**               | 8–12 tyg (po 3000 DAU) | Aplikacje natywne                             |

Pełen breakdown sprintów: [`docs/roadmap/01_phases.md`](docs/roadmap/01_phases.md).
