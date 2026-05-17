# REVIEW_BRIEF.md — Brief dla Claude Code (lub innego reviewera)

Ten plik jest specjalnie dla osoby (lub agenta) wykonującego pierwszą rewizję szkieletu.

## Kontekst — co rewizujesz

To jest **świeży scaffold** projektu MIGMIG Concierge wygenerowany z pakietu specyfikacji (`docs/` + `INSTRUCTIONS_FOR_COWORK.md`). NIE rewizujesz produkcyjnego kodu — nie ma jeszcze logiki biznesowej. Rewizja ma odpowiedzieć na trzy pytania:

1. Czy struktura projektu zgadza się ze specyfikacją (`PROJECT_TREE.md` + `docs/`)?
2. Czy stuby plików są semantycznie poprawne (importy, typy, konwencje Next.js 14 + Supabase SSR)?
3. Czy są oczywiste pułapki, które ugryzą nas w Fazie 1 (np. źle zdefiniowany middleware Supabase, błędna konfiguracja Tailwind)?

## Suggested review prompt (skopiuj do Claude Code lub Cursor)

```
Jesteś senior fullstack engineer robiącym code review szkieletu projektu Next.js 14 + Supabase.

Najpierw przeczytaj CLAUDE.md i SETUP_GUIDE.md, potem PROJECT_TREE.md i docs/architecture/01_overview.md.

Następnie zweryfikuj:

1. STRUKTURA — czy drzewo katalogów w src/, supabase/, public/ zgadza się 1:1 z PROJECT_TREE.md. Wymień rozbieżności.

2. KONFIGURACJA — przeczytaj package.json, tsconfig.json, next.config.js, tailwind.config.ts, postcss.config.js. Czy wszystkie wersje są kompatybilne? Czy brakuje jakiegoś dev-deps potrzebnego do `npm run build` na czystej maszynie?

3. SUPABASE CLIENTS — porównaj src/lib/supabase/{client,server,admin,middleware}.ts z aktualną dokumentacją @supabase/ssr 0.5.x. Czy `cookies()` w server.ts jest wywoływane poprawnie dla Next.js 14? Czy middleware refresh działa?

4. AUTH FLOW — prześledź ścieżkę: src/app/(auth)/login/page.tsx → OAuthButtons.tsx → signInWithOAuth → /(auth)/callback/route.ts. Czy exchangeCodeForSession jest wywoływane poprawnie?

5. MIGRACJE SQL — otwórz supabase/migrations/20260516000001_initial_schema.sql i 02_rls_policies.sql. Czy zawierają tabele opisane w docs/architecture/01_overview.md i docs/modules/*? Czy są tabele wymienione w spec, których brakuje w SQL?

6. EDGE FUNCTIONS — czy 4 stuby w supabase/functions/ wskazują na właściwe odpowiedzialności wg docs/api/01_endpoints.md i docs/architecture/04_realtime_tracking.md?

7. RYZYKA — wymień 5 największych ryzyk technicznych, które widzisz na podstawie spec, jeszcze przed napisaniem pierwszej linijki logiki biznesowej. Dla każdego: jak je zmitygować w Fazie 0/1.

8. CO POMINIĘTO — czy są pliki, które spec wymaga, a których w scaffoldzie nie ma? (Sprawdź sekcję "Pakiet dla Cowork" w MIGMIG_Concierge_koncepcja_v2.docx jeśli dołączony, inaczej w PROJECT_TREE.md.)

Format raportu:
- Krótkie executive summary (5-10 zdań).
- Per sekcja: ✓ OK / ⚠️ wymaga uwagi / ❌ błąd. Krótki opis + konkretna sugestia naprawy.
- Lista TODO w priorytecie (must-fix przed Fazą 1 → nice-to-have).
```

## Co rewizer powinien dostać oprócz tego promptu

- Cały folder `C:\Projekty\jokusMigMig` (lub repo na GitHubie po push z `SETUP_GUIDE.md` część I1)
- Dostęp do `MIGMIG_Concierge_koncepcja_v2.docx` (referenced spec — opcjonalnie)

## Czego NIE rewizować w tym etapie

- Wydajność (nic nie chodzi jeszcze)
- Bezpieczeństwo niskopoziomowe (RLS będziemy oddzielnie audytować w Fazie 1)
- Style komponentów (poza login/landing nie ma jeszcze UI)
- Testy (Faza 6 wg roadmap)
- SEO/accessibility (Faza 6)

## Po review

Wynik (lista ⚠️ i ❌) wraca jako issues w repo `migmig-concierge` na GitHub. Adresujemy je przed startem Fazy 1.
