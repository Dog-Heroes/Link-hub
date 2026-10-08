# Link hub Dog Heroes

Link hub interno di Dog Heroes (sostituisce un Linktree esterno): pagina
pubblica `/hub` con link configurabili, tab Shop/Quiz/Store Locator,
analytics dei click e un'area `/admin` per gestire tutto senza toccare il
codice.

In produzione su https://link.dogheroes.it (Render, Web Service
`link-hub-eu`, deploy automatico da `main`).

Stack: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4,
NextAuth v5 (beta, provider Google), DB libSQL via Turso, `@dnd-kit` per il
CMS drag&drop.

Per lo stato dettagliato di produzione, variabili d'ambiente, il database
condiviso locale/produzione (e la sua trappola), store locator, quiz e UTM:
vedi **[AGENTS.md](./AGENTS.md)**.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # compila i valori reali, mai committarli
npm run dev
```

Apri http://localhost:3000.

⚠️ Il database Turso usato in locale è **lo stesso** della produzione: ogni
modifica ai dati (link, sezioni, tab) è immediatamente live sul sito
pubblico. Dettagli e regola da seguire in [AGENTS.md](./AGENTS.md#database--turso-libsql-unico-per-locale-e-produzione).

## Script utili

```bash
npm run build   # include typecheck, non richiede variabili d'ambiente
npm run lint
npx tsx scripts/test-bridge-url.ts            # valida l'URL del bridge quiz verso il tema
npx tsx scripts/test-utm-discount-redirect.ts # valida gli UTM sui link discount/redirect
npx tsx scripts/generate-quiz-options-fallback.ts # rigenera il fallback delle opzioni quiz
```

## Deploy

Ogni merge su `main` fa il deploy automatico su Render. La CI
(`.github/workflows/ci.yml`) esegue secret scan (gitleaks) e build Node ad
ogni PR e push su `main`.
