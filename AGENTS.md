# Link hub Dog Heroes — AGENTS.md

> Letto da CLAUDE.md (`@AGENTS.md`). Vale per qualunque agente/sessione Claude
> che lavora in questa cartella (`Linktree/`, repo GitHub `Dog-Heroes/Link-hub`,
> agente di progetto `link-hub` nell'ombrello `dogheroes-workspace`).

## Cos'è

Link hub ("Linktree" interno) di Dog Heroes: pagina `/hub` con CMS dei link,
tab configurabili (Link, Shop, Quiz, Store Locator), analytics dei click e
area `/admin` con login Google. Sostituisce un Linktree esterno con un
prodotto proprio, collegato allo store Shopify e al tema.

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4,
NextAuth v5 (beta) con provider Google, DB libSQL (Turso) via `@libsql/client`,
`@dnd-kit` per il drag&drop del CMS, Framer Motion per le animazioni.

**Next.js 16 ha breaking change rispetto al training**: prima di scrivere
codice leggi la guida pertinente in `node_modules/next/dist/docs/`. Non dare
per scontate API o convenzioni di versioni precedenti di Next.js.

## Produzione

- **Hosting**: Render, Web Service `link-hub-eu` (piano Starter, regione
  Frankfurt). Auto-deploy da `main` a ogni push/merge. Build:
  `npm install; npm run build`. Start: `npm run start`.
- **Dominio**: https://link.dogheroes.it (CNAME `link` →
  `link-hub-eu.onrender.com` su Cloudflare, modalità "DNS only"/nuvola
  grigia — niente proxy Cloudflare davanti, il certificato TLS è quello di
  Render). Indirizzo di riserva (usabile anche senza DNS):
  https://link-hub-eu.onrender.com.
- Il vecchio servizio Render `Link-hub` in Oregon
  (`link-hub-rdrw.onrender.com`) è **sospeso**: non è più la produzione, non
  riattivarlo senza verificare prima con chi ha fatto il cambio.
- **Admin**: https://link.dogheroes.it/admin — login Google limitato alle
  email in `ADMIN_ALLOWED_EMAILS`.

## Database — Turso (libSQL), UNICO per locale e produzione

⚠️ **Trappola**: `.env.local` e produzione puntano allo **stesso** database
Turso (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`). Non esistono un DB "di
sviluppo" e uno "di produzione" separati: qualunque modifica ai dati fatta in
locale (via `/admin`, script, o query dirette) è **immediatamente live** sul
sito pubblico, e viceversa.

Di conseguenza: **prima il merge/deploy del codice, poi eventuali modifiche
ai dati** che quel codice si aspetta. Mai il contrario. Incidente di
riferimento (8 ottobre 2026): un link CMS con id `#quiz` creato nel DB prima
che il codice capace di gestire le tab interne (`#<id-tab>`) fosse deployato
ha mandato `/hub` in errore 500 in produzione.

`local.db` nella root è solo un **fallback obsoleto** (usato quando
`TURSO_DATABASE_URL` non è impostata, vedi `src/lib/db.ts`): non è il DB
usato in pratica, non va trattato come sorgente di verità, e non va MAI
committato (è in `.gitignore`).

Lo schema (`migrate()` in `src/lib/db.ts`) copre: `settings`, `tabs`,
`sections`, `links`, `social_links`, `quiz_options`, `events` (click
analytics). **Non esiste una tabella `stores` di proprietà dell'app**: una
eventuale vecchia tabella `stores` rimasta in un DB esistente va lasciata
inutilizzata, mai droppata (dati di produzione) — vedi sezione Store locator.

## Variabili d'ambiente

Vedi `.env.example` per il template completo. Solo i nomi, mai i valori nei
commit/log/documenti:

| Variabile | Uso |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | DB libSQL condiviso locale+prod |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Google per `/admin` |
| `AUTH_SECRET` | secret NextAuth (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | richiesto da NextAuth v5 dietro proxy/reverse-proxy (Render) |
| `NEXTAUTH_URL` | URL pubblico canonico, oggi `https://link.dogheroes.it` |
| `ADMIN_ALLOWED_EMAILS` | email/domini ammessi su `/admin` (vuoto = tutti ammessi, vedi `src/lib/auth.ts`) |
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | lettura prodotti (tab Shop) via Admin API client_credentials |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | mappa dello Store Locator |
| `NEXT_PUBLIC_ENABLE_*` | **legacy, non più letti dal codice**: la visibilità delle tab oggi viene dal DB (tabella `tabs`), non da feature flag a build time |

Se cambia il dominio di produzione: aggiornare `NEXTAUTH_URL` **insieme**
agli "Authorized JavaScript origins" e "Authorized redirect URIs" del client
OAuth Google — altrimenti il login su `/admin` si rompe.

## Store locator — niente DB proprio, niente sync Shopify propria

Refactor di ottobre 2026 (branch `store-locator-admin`, poi mergiato):
l'hub **non** mantiene più negozi in un proprio DB né li sincronizza da solo
su Shopify. `src/lib/store-locator.ts` legge i negozi direttamente dalla
pagina già live del tema, https://www.dogheroes.it/pages/punti-vendita
(attributo `data-data-url` del widget → file `store-locations.json`
pubblicato dal tema), con cache di 1 ora e fallback statico
`src/config/stores.json` se la pagina non è raggiungibile o cambia forma.

La fonte unica dei dati è quindi il **repo del tema**
(`Dog-Heroes/dogheroes-theme`, `snippets/store-locator-widget.liquid`), non
questo repo. L'URL del file dati cambia a ogni deploy del tema (path CDN con
id tema + hash versione): per questo va letto dalla pagina, mai hardcodato.

`shopify-bridge/` nella root di questo repo contiene codice di una
generazione precedente, **superata** dal bridge ora implementato nel tema
(vedi sotto): lasciata solo come riferimento storico, non è più il percorso
attivo.

⚠️ **Interfaccia condivisa**: lo stesso store Shopify `dogheroes-production`
è usato anche dal tema (`shopify-store`), da Paws (`paws-app`) e dal CRM
(`sales-crm`). Qualunque modifica che faccia scrivere questo hub su Shopify
va segnalata al coordinatore prima di procedere.

## Quiz "Piano su Misura" — stesse opzioni del sito, bridge al tema

`src/lib/quiz-options.ts` legge le opzioni del quiz (razze, livello attività,
condizione corporea, appetito, dieta, allergie, problemi di salute, ecc.)
direttamente dalla pagina live https://www.dogheroes.it/pages/quiz (tag
`<meta name="dogheroes:algorithm-data">`, JSON con encoding HTML entity) +
template degli step, con cache di 1 ora e fallback statico
`src/config/quiz-options-fallback.json` (rigenerabile con
`scripts/generate-quiz-options-fallback.ts` quando cambiano le opzioni live
in modo significativo: nuove razze, nuovi metaobject di allergie/patologie).

Perché: il bridge sul tema valida ogni valore contro le proprie opzioni e
**scarta silenziosamente** qualunque valore che non corrisponde — l'utente si
ritroverebbe bloccato a reinserire quel campo sul sito. Leggere le opzioni
live (con fallback dello stesso giorno) è l'unico modo per garantire che
l'hub mandi sempre valori che il bridge accetta.

Tutti i campi sono obbligatori esattamente come sul sito — sesso, età,
sterilizzazione, appetito, dieta — **nessun default silenzioso**.

A fine quiz, redirect al bridge sul tema:

```
https://www.dogheroes.it/pages/quiz?bridge=1&<dati cane>&utm_*
```

I dati del cliente (nome, email, telefono, CAP, consenso) vanno **solo** nel
fragment dell'URL, mai in query string: `#c_name&c_email&c_phone&c_zip&c_consent=1`.
Non vanno mai salvati nel DB di questo hub né nelle sue analytics interne.

Il tema (repo `Dog-Heroes/dogheroes-theme`, PR #302/#305/#306,
`handleBridge()` in `snippets/dogheroes--quiz.liquid`) valida tutto, si ferma
sul primo step con dati mancanti, e — con dati completi e consenso — invia
automaticamente allo step 10 → Paws → `/pages/recipes`.

Il testo e i link di consenso raccolti nell'hub (privacy policy, termini)
devono restare allineati a quelli del sito.

Test disponibili (nessun test-runner configurato nel progetto, script
standalone eseguibili con `npx tsx`):

```bash
npx tsx scripts/test-bridge-url.ts
npx tsx scripts/test-utm-discount-redirect.ts
```

## UTM

Tutti i link verso dogheroes.it generati dall'hub ricevono
`utm_source=linktree&utm_medium=bio` (vedi `src/lib/utm.ts`,
`src/hooks/useUTM.ts`). Il parametro `?s=` sull'URL dell'hub seleziona la
campagna:

- `https://link.dogheroes.it/hub?s=ig` → `utm_campaign=instagram`
- `https://link.dogheroes.it/hub?s=tt` → `utm_campaign=tiktok`

Per i link `/discount/CODICE?redirect=...` gli UTM vanno **dentro** il
parametro `redirect`, non sull'URL esterno.

I link CMS con `url` nella forma `#<id-tab>` (es. `#quiz`) aprono una tab
interna invece di navigare: vedi la trappola del DB condiviso sopra prima di
crearne uno nuovo.

## Link CMS — regole

- I link verso Dog Heroes puntano sempre a **dogheroes.it** (mai `.com`).
- Box prova consigliato: `/discount/LTREE30?redirect=/pages/quiz` (LTREE30 =
  31% di sconto).

## Come sviluppare in locale

```bash
npm install
cp .env.example .env.local   # poi compila i valori reali (mai committarli)
npm run dev
```

Apri http://localhost:3000. `/hub` è la pagina pubblica, `/admin` richiede
login Google (vedi `ADMIN_ALLOWED_EMAILS`).

⚠️ Il DB Turso è **condiviso con la produzione** (vedi sopra): qualunque
modifica ai dati fatta in locale (via `/admin` o script) è live sul sito
pubblico. Testare prima la UI/logica senza toccare dati reali quando
possibile; se serve creare/modificare dati per un test, farlo sapendo che il
codice in produzione deve già saperli gestire.

`npm run build` esegue anche il typecheck e **non richiede variabili
d'ambiente** (vedi CI). `npm run lint` è attualmente escluso dalla CI per 4
errori ESLint preesistenti non ancora risolti.

## Deploy

Merge su `main` → deploy automatico su Render (`link-hub-eu`). Non c'è uno
step manuale: verificare che la CI (`.github/workflows/ci.yml`, secret scan +
build Node) sia verde prima di mergiare una PR.

## Sicurezza e dati

- Mai committare file `.env*` (solo `.env.example` è tracciato) né `local.db`.
- Repo **pubblico** su GitHub (da valutare se renderlo privato: attenzione,
  sul piano Vercel Pro aziendale i collaboratori di repo privati hanno un
  costo — punto ancora aperto, non deciso).
- Nessun dato cliente del quiz (nome, email, telefono, CAP) va salvato nel DB
  di questo hub: viaggia solo nel fragment dell'URL verso il bridge del tema.

## Aperti / da decidere

- Sconto nel flusso quiz: punto ancora da decidere.
- Repo pubblico vs privato (vedi sopra).
- `shopify-bridge/` superato dal bridge nel tema: lasciato come riferimento,
  valutare se rimuoverlo in futuro.
