# Uruchomienie review przez Claude Code

Krok po kroku jak oddać ten projekt do rewizji przez Claude Code (CLI).

## 1. Instalacja Claude Code

Wymaga zainstalowanego Node.js (część A1 z `SETUP_GUIDE.md`).

```powershell
npm install -g @anthropic-ai/claude-code
claude --version
```

Pierwszy `claude` w katalogu projektu poprosi o zalogowanie (otworzy przeglądarkę). Loguj się tym samym kontem co Twoja subskrypcja Claude.

## 2. Przejście do projektu

```powershell
cd C:\Projekty\jokusMigMig
claude
```

Claude Code od razu wczyta `CLAUDE.md` z root — to jest jego "system prompt" dla tego projektu.

## 3. Skopiowanie konfiguracji uprawnień (opcjonalne, ale rekomendowane)

W tym repo jest plik `claude-settings.example.json` z bezpiecznymi domyślnymi (czyta wszystko, pisze nic destrukcyjnego bez pytania, blokuje `git push` i pliki `.env.local`).

Po pierwszym uruchomieniu `claude` powstanie folder `.claude/`. Skopiuj wzorzec:

```powershell
copy claude-settings.example.json .claude\settings.json
```

Zrestartuj Claude Code (Ctrl+C → ponownie `claude`). Od tej chwili nie będzie pytał za każdym razem o standardowe operacje.

## 4. Uruchomienie review

W sesji Claude Code wklej:

```
Przeczytaj REVIEW_BRIEF.md i wykonaj review zgodnie z promptem w sekcji "Suggested review prompt".
Wynik zapisz do pliku REVIEW_REPORT.md w root.
```

Claude przeczyta `CLAUDE.md`, potem `REVIEW_BRIEF.md`, potem zrobi systematyczne przejście po sekcjach 1-8 z brief'u. Zajmie 3-7 minut.

## 5. Po review

Otwórz `REVIEW_REPORT.md` w VS Code. Sekcje oznaczone ❌ adresujesz przed `npm install`. Sekcje ⚠️ — przed startem Fazy 1. Sekcje ✓ — nie ruszasz.

## 6. (Opcjonalnie) Iteracja z Claude Code nad fix-ami

Po raporcie, w tej samej sesji:

```
Zaadresuj sekcję "❌ MUST FIX" z REVIEW_REPORT.md. Po każdej zmianie pokaż diff i czekaj na moje potwierdzenie przed kolejną.
```

To trzyma kontrolę w Twoich rękach — Claude proponuje, Ty akceptujesz/odrzucasz.

## Alternatywy

- **Cursor** zamiast Claude Code CLI: otwórz folder, użyj wbudowanego chatu z trybem "Agent" lub "Composer". Wklej content z `REVIEW_BRIEF.md` jako prompt. Cursor będzie miał ten sam CLAUDE.md jako kontekst.
- **Web Claude** (https://claude.ai): wrzuć zipa z całego folderu (`Compress-Archive -Path C:\Projekty\jokusMigMig -DestinationPath migmig.zip`) i wklej prompt z REVIEW_BRIEF.md. Mniej wygodne niż CLI/IDE bo bez bash, ale działa.

## Co Claude Code MOŻE w tym projekcie (domyślnie po `settings.json`)

- Czytać każdy plik (poza `.env.local`)
- Uruchamiać `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run format`, `npm run dev`
- Wykonywać `git status`, `git diff`, `git log`, `git branch`, `git show`
- Wykonywać `npx tsc`, `npx prettier`

## Czego NIE może bez Twojej zgody

- `git push` (zablokowany)
- `git reset --hard` (zablokowany)
- `rm -rf` (zablokowany)
- Czytać `.env.local`, `.env.production` (twoje sekrety)
- Wszystko inne — Claude i tak zapyta zanim wykona.
