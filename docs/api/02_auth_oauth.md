# Auth: OAuth + szybkie rejestracje

## Wymaganie biznesowe

Mieszkaniec, który widzi MIGMIG po raz pierwszy, ma być **w aplikacji w 10 sekund** bez wpisywania emaila i hasła. Każda dodatkowa friction redukuje konwersję o ~20%.

Rozwiązanie: trzy OAuth providers + magic link email jako fallback.

## Providers w kolejności priorytetu

### 1. Google (najwyższy priorytet)

- ~80% Polaków ma konto Google
- Najmniej friction (jedno kliknięcie + biometria/PIN)
- Bezpłatne dla developera
- Wymaga: Google Cloud Console project + OAuth consent screen

### 2. Facebook

- Wciąż popularne wśród grupy 35+
- Mniej zaufania niż Google (po skandalach z danymi), ale wciąż używane
- Wymaga: Facebook Developer account + app review (dla scope `email`)

### 3. Apple Sign In

- Wymagane przez App Store dla aplikacji iOS oferujących inny OAuth (regulamin Apple)
- Na etapie PWA opcjonalne; obowiązkowe gdy będzie RN dla iOS
- Wymaga: Apple Developer Program ($99/rok)

### 4. Email magic link (fallback)

- Dla osób bez kont social albo nieufnych
- Bez hasła — link w emailu
- Wbudowane w Supabase Auth

## Konfiguracja w Supabase

Supabase Auth ma OAuth providers wbudowane. Konfiguracja w Dashboard:

**Authentication → Providers:**

```
Google:
  Enabled: ✓
  Client ID: <z Google Cloud Console>
  Client Secret: <z Google Cloud Console>
  Authorized redirect URI: https://<projekt>.supabase.co/auth/v1/callback

Facebook:
  Enabled: ✓
  Client ID: <App ID z Facebook Developer>
  Client Secret: <App Secret>

Apple:
  Enabled: ✓ (po założeniu Apple Developer)
  Service ID: <Apple Service ID>
  Team ID: <Apple Team ID>
  Key ID: <Sign In with Apple Key>
  Secret Key: <prywatny klucz .p8>

Email:
  Enabled: ✓
  Confirm email: ✗ (magic link nie wymaga confirmation)
  Secure email change: ✓
```

**Authentication → URL Configuration:**

- Site URL: `https://migmig.pl`
- Redirect URLs:
  - `https://migmig.pl/auth/callback`
  - `http://localhost:3000/auth/callback` (dev)

## Implementacja w kodzie

### Komponent OAuth buttons

```typescript
// src/components/shared/OAuthButtons.tsx
'use client';
import { createClient } from '@/lib/supabase/client';

export function OAuthButtons() {
  const supabase = createClient();

  async function signInWithProvider(provider: 'google' | 'facebook' | 'apple') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  return (
    <div className="space-y-3">
      <button onClick={() => signInWithProvider('google')}
              className="oauth-btn">
        <GoogleIcon /> Kontynuuj z Google
      </button>
      <button onClick={() => signInWithProvider('facebook')}
              className="oauth-btn">
        <FacebookIcon /> Kontynuuj z Facebook
      </button>
      <button onClick={() => signInWithProvider('apple')}
              className="oauth-btn">
        <AppleIcon /> Kontynuuj z Apple
      </button>
    </div>
  );
}
```

### Callback handler

```typescript
// src/app/(auth)/callback/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Pierwsza rejestracja? Utwórz rekord w public.users
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        // OAuth user pierwszy raz
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
          role: 'resident',
          oauth_provider: user.app_metadata.provider
        });

        // Pierwszy raz → redirect do onboardingu (dodaj adres)
        return NextResponse.redirect(`${origin}/onboarding/address`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/home`);
}
```

### Trigger w Supabase — auto-create user row

Alternatywnie (bezpieczniejsze) trigger w bazie:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, oauth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

To gwarantuje, że każdy `auth.users` ma odpowiadający rekord w `public.users`, bez race condition.

## Onboarding flow

Pierwszy raz po OAuth:

```
1. /auth/callback                  ← OAuth dance
2. Trigger auto-create user row    ← role: 'resident'
3. /onboarding/address             ← prośba o adres (wymagane)
   - Pole z Mapbox geocoding autocomplete
   - Weryfikacja czy adres jest w obsługiwanym osiedlu
   - Jeśli tak: zapisz address + redirect do /home
   - Jeśli nie: pokaż "MIGMIG jeszcze nie dotarł" + email signup do listy oczekujących
4. /home                           ← kafelki modułów
```

## Czego AVOID

### ❌ Nie wymuszaj weryfikacji telefonu na start

- To jest friction
- Wymagaj telefonu dopiero przy pierwszym zamówieniu (potrzebny do kontaktu z jokusorem)

### ❌ Nie wymuszaj imienia i nazwiska

- OAuth providers już to dostarczają w `user_metadata`
- Jeśli pole puste — pozwól wypełnić w profilu później

### ❌ Nie wymuszaj weryfikacji email

- Magic link już potwierdza email
- Google/Facebook/Apple już zweryfikowali email po swojej stronie

## Bezpieczeństwo

### Rotacja sekretów

- Client secrets per provider rotowane co 6 miesięcy
- Logi audytu (kto się logował, jak, kiedy) w `audit_log`

### Konta wielokrotne

Co jeśli user ma to samo email w Google i Facebook? Supabase trzyma to jako jednego usera (przez `auth.users.email`). Logowanie różnym providerem ten sam user.

### Linkowanie kont

Future: pozwól userowi linkować dodatkowe providery do istniejącego konta. Na MVP: jedno konto = jeden provider.

### Konto admina

Konto Michała (admin) ma:

- Provider: dowolny (Google najlepiej)
- Po pierwszym logowaniu: ręczna zmiana `role` w bazie na `'admin'` (przez SQL Editor)
- Future: panel zarządzania adminami (rola "super_admin" dla Michała)

## UI ekranów

### `/login` (lub `/register` — ten sam ekran)

```
┌──────────────────────────────────┐
│                                  │
│         MIGMIG Concierge         │
│      Twój osiedlowy asystent     │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🟢 Kontynuuj z Google      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🔵 Kontynuuj z Facebook    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚫ Kontynuuj z Apple        │  │
│  └────────────────────────────┘  │
│                                  │
│  ─────── lub ─────────────       │
│                                  │
│  Email: [_________________]      │
│  [→ Wyślij magiczny link]        │
│                                  │
│  Logowanie oznacza akceptację    │
│  Regulaminu i Polityki Pryw.     │
└──────────────────────────────────┘
```

Bez pól haseł. Bez "zapomniałem hasła". Bez kombinacji "captcha + 8 znaków + cyfra + znak specjalny".

## Mierzenie konwersji

Kluczowe metryki:

- **CTR OAuth button** (kliknięcie → callback): cel > 60%
- **Onboarding completion** (callback → adres dodany): cel > 80%
- **First order time** (rejestracja → pierwsze zamówienie): cel < 24h dla 50% userów

Eventy do PostHog:

- `auth_oauth_clicked` z `{ provider }`
- `auth_signup_completed` z `{ provider, time_to_complete_sec }`
- `onboarding_address_added`
- `onboarding_out_of_range` (smutny event — adres poza zasięgiem)
