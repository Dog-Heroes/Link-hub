# Link hub Dog Heroes — AGENTS.md

> Letto da CLAUDE.md (`@AGENTS.md`). Vale per qualunque agente/sessione Claude
> che lavora in questa cartella (`Linktree/`, repo GitHub `Dog-Heroes/Link-hub`,
> agente di progetto `link-hub` nell'ombrello `dogheroes-workspace`).

## Cos'è

Link hub ("Linktree" interno) di Dog Heroes: pagina `/hub` con CMS dei link,
tab configurabili (Link, Shop, Quiz, Store Locator), analytics dei click e
area `/admin` con login Google. Sostituisce un Linktree esterno con un
prodotto proprio, collegato allo store Shopify e al tema.

**Multi-brand (dog / cat)**: lo stesso servizio serve anche Cat Heroes su
`/cat` — vedi la sezione dedicata più sotto.

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

**Migrazione automatica allo startup**: `migrate()` (additiva/idempotente)
gira da sola **una volta per processo, prima che il server accetti
richieste**, via `src/instrumentation.ts` → `register()` (hook ufficiale di
Next.js) → `ensureMigrated()` in `src/lib/db.ts` (promise memoizzata). Non
serve quindi alcuno step manuale dopo il deploy perché lo schema sia pronto:
è sicuro farla girare anche contro il DB condiviso a ogni boot, perché ogni
cambiamento è `ADD COLUMN`/`CREATE TABLE IF NOT EXISTS` guardato (non tocca
mai una colonna/tabella già esistente). Se dovesse fallire allo startup (es.
DB momentaneamente irraggiungibile), l'errore viene solo loggato — il server
parte comunque, e le pagine pubbliche hanno un fallback proprio (vedi sotto)
anziché crashare. `ensureMigrated()` viene richiamata anche da `HubShell`,
da `/api/track` e dalle pagine di `/admin` prima delle loro query, come rete
di sicurezza in più (costa poco: dopo il primo successo è solo un await su
una promise già risolta).

⚠️ Questo riguarda **solo lo schema** (colonne/tabelle): i *contenuti* restano
soggetti alla regola sopra — uno script come `scripts/seed-cat.ts` che
inserisce righe va comunque lanciato solo dopo che il codice che le usa è in
produzione.

`local.db` nella root è solo un **fallback obsoleto** (usato quando
`TURSO_DATABASE_URL` non è impostata, vedi `src/lib/db.ts`): non è il DB
usato in pratica, non va trattato come sorgente di verità, e non va MAI
committato (è in `.gitignore`).

Lo schema (`migrate()` in `src/lib/db.ts`) copre: `settings`, `tabs`,
`sections`, `links`, `social_links`, `quiz_options`, `events` (click
analytics), `brand_settings`. **Non esiste una tabella `stores` di proprietà
dell'app**: una eventuale vecchia tabella `stores` rimasta in un DB esistente
va lasciata inutilizzata, mai droppata (dati di produzione) — vedi sezione
Store locator.

`tabs`, `sections`, `links` e `social_links` hanno una colonna
`brand TEXT NOT NULL DEFAULT 'dog'` (aggiunta via `ALTER TABLE ... ADD COLUMN`
idempotente, guardia `PRAGMA table_info`) che separa i contenuti di Dog
Heroes (`/hub`) da quelli di Cat Heroes (`/cat`) — vedi la sezione "Multi-brand"
più sotto. `events` ha la stessa colonna per poter separare le analytics per
brand anche sugli eventi senza `link_id` (vista pagina, ricerca store...).
`brand_settings(brand, key, value)` è una tabella **nuova**, separata dalla
`settings` globale preesistente (che `/hub` continua a leggere/scrivere
esattamente come prima — PK senza dimensione brand, non toccarla): contiene
tagline/meta per i brand diversi da "dog" e lo stile ("Aspetto") di
**entrambi** i brand.

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

## Multi-brand: Cat Heroes (`/cat`)

Lo stesso servizio serve anche Cat Heroes su `/cat`, con solo le tab **Link**
e **Store** (niente Piano su Misura né Shop). `/hub` (Dog Heroes) resta
invariato: stessa UI, stesse query, stesso comportamento di prima — vedi
sotto come viene garantito.

**Dati**: `src/lib/brand.ts` definisce `Brand = "dog" | "cat"`. Ogni tab,
sezione, link e social link ha una colonna `brand` (vedi sezione Database);
`HubShell` (ora `HubShell({ brand })`, chiamato con `brand="dog"` da
`/hub/page.tsx` e `brand="cat"` da `/cat/page.tsx`) filtra ogni query per
brand. Id delle tab di Cat Heroes: `links-cat` e `stores-cat` (quelle di Dog
Heroes restano `links` e `stores`, invariate). `src/lib/brand.ts` espone
anche `linksTabId(brand)` per non hardcodare questi id altrove.

**Store locator su `/cat`**: `StoreLocatorTab` accetta una prop `brand`; con
`brand="cat"` il filtro "solo negozi che vendono anche gatto" (già esistente,
basato sul campo `brands` dei negozi — vedi `src/lib/store-locator.ts`) è
**forzato sempre attivo** e il toggle "🐱 Anche gatto" è nascosto. Su `/hub`
(`brand` assente/`"dog"`) il comportamento resta quello di prima (toggle
visibile, filtro opzionale). Nessun negozio è "di proprietà" di questo hub in
nessuno dei due casi — vedi sezione Store locator sopra.

**UTM**: i link della pagina `/cat` verso dogheroes.it ricevono
`utm_source=linktree_cat` invece di `utm_source=linktree` (stesso
`utm_medium=bio` e stessa mappatura `?s=ig|tt` → `utm_campaign`, vedi sezione
UTM). `useUTM(brand)` e `getFixedUTM(params, brand)` in `src/lib/utm.ts`
accettano il brand; i componenti lo ricevono a cascata da `HubShell` → `TabBar`
→ `LinksTab`/`StoreLocatorTab`.

**Analytics**: la tabella `events` ha anch'essa una colonna `brand` (vedi
sezione Database) così da poter separare le metriche di `/hub` e `/cat`
anche per gli eventi senza `link_id` (vista pagina, ricerca store...).
`trackEvent(event, properties, brand)` in `src/lib/analytics.ts` accetta il
brand come terzo argomento (default `"dog"`).

**Aspetto (stile editabile per brand)**: in `/admin` → **Aspetto**
(`src/components/admin/AppearanceForm.tsx`, `src/app/admin/(dashboard)/aspetto/`)
si modifica, con anteprima live: palette (primario, accento, sfondo pagina,
sfondo header, testo, testo header, sfondo card/pulsanti, testo pulsanti),
font titoli/testo (lista curata di Google Font in `CURATED_FONTS` — include
anche Inter, Cardo e **GT Pressura**, i font già caricati dall'app, così il
default di Dog Heroes non richiede alcun nuovo font), raggio angoli di
card/pulsanti, logo (URL `https://` o percorso `/pubblico`) e immagine header
opzionale. Tutto è salvato in `brand_settings` sotto chiave = nome del campo
(`colorPrimary`, `fontHeading`, `radius`, `logoUrl`, ...), validato/sanificato
lato server da `sanitizeStyle()` in `src/lib/brand.ts` (colori solo hex
validi, font solo dalla lista curata, raggio clampato 0–32px, URL logo solo
`https://` o percorso locale) — un valore non valido viene scartato, mai
salvato: non può mai rompere il rendering. "Ripristina predefinito" cancella
le righe `style_*`/di stile di quel brand da `brand_settings` (il rendering
torna automaticamente al default hardcoded, zero righe necessarie).

I **default** sono hardcoded in `src/lib/brand.ts`:
- `DOG_DEFAULT_STYLE` = l'aspetto **attuale** di produzione (rosso `#E1251B`,
  blu `#002B49`, bianco, font `GT Pressura`/`Inter`): **senza alcuna riga in
  `brand_settings`, `/hub` renderizza pixel-identico a prima di questa
  feature** — è il punto che garantisce la non-regressione.
- `CAT_DEFAULT_STYLE` = giallo Cat Heroes `#F9EC64` (colore confermato nel
  tema, `assets/dogheroes--catheroes-blog.css`) come sfondo/header, nero
  `#111111` come accento/testo.

Il logo di default di Cat Heroes è `public/catheroes-logo.webp` (wordmark
nero su sfondo trasparente, ritagliato dal file fornito da Marco —
`public/catheroes-logo-yellow.webp` tiene anche l'originale con lo sfondo
giallo, come riferimento). **Non è un SVG ufficiale**: se/quando Cat Heroes
fornisce un logo vettoriale, va sostituito qui (o via il campo Logo
dell'Aspetto, che accetta qualunque URL `https://` o asset `/pubblico`).

**Admin — switch brand**: in cima alla sidebar di `/admin` c'è uno switch
Dog/Cat (`src/components/admin/BrandSwitch.tsx`) che persiste il brand attivo
in un cookie httpOnly (`admin_brand`, via `POST /api/admin/brand`) letto da
ogni pagina admin server-side (`getAdminBrand()` in `src/lib/admin-brand.ts`
— **non** in `src/lib/brand.ts`, che resta importabile anche da componenti
client perché non tocca `next/headers`). Lo switch filtra le tab, le sezioni,
i link, i social e le impostazioni mostrate; qualunque cosa si crei mentre un
brand è attivo (nuova sezione, nuovo link, nuovo social) viene taggata con
quel brand — vedi `POST /api/admin/sections`, `/api/admin/social`.
`POST /api/admin/links` invece **deriva** il brand del link dalla sua
sezione lato server (mai dal client), così un link non può mai finire
taggato con un brand diverso da quello della sua sezione.

**Impostazioni (tagline/meta) per brand diverso da "dog"**: usano
`/api/admin/brand-settings` invece della `settings` globale — vedi sezione
Database. La pagina Impostazioni (`SettingsForm`) mostra solo tagline/meta
per i brand diversi da "dog" (Trustpilot, quiz e sconto restano funzionalità
solo Dog Heroes, non hanno senso su `/cat`); il widget Trustpilot stesso non
viene mostrato su `/cat` (business unit Trustpilot è solo di Dog Heroes).

**Seed**: `scripts/seed-cat.ts` (idempotente, `INSERT OR REPLACE`) crea le
due tab Cat Heroes, una sezione con 2–3 link segnaposto verso le pagine Cat
Heroes di dogheroes.it, e tagline/meta di default in `brand_settings`. La
migrazione dello schema (colonne `brand` + tabella `brand_settings`) **non**
dipende più da questo script: gira da sola allo startup del server (vedi
sezione Database, "Migrazione automatica allo startup") — questo script
resta solo per i **contenuti** Cat Heroes, e **non va eseguito contro il DB
condiviso prima che il codice che li usa sia in produzione** (merge + deploy
completato) — vedi avviso nello script stesso e la trappola del DB condiviso
più sopra. Nessuna riga di stile viene seminata (il default Cat Heroes si
applica da codice senza bisogno di dati). Procedura completa: **merge → deploy
(migrazione schema automatica) → verifica `/hub` identico e `/cat` 200 →
`scripts/seed-cat.ts` → contenuti reali dall'admin**.

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
npx tsx scripts/test-cat-utm-and-brand.ts   # UTM linktree_cat, filtro brand, sanificazione stile Aspetto
```

## UTM

Tutti i link verso dogheroes.it generati dall'hub ricevono
`utm_source=linktree&utm_medium=bio` (vedi `src/lib/utm.ts`,
`src/hooks/useUTM.ts`). Su `/cat` (Cat Heroes) `utm_source` è
`linktree_cat` invece di `linktree` — vedi sezione Multi-brand — stesso
`utm_medium=bio` e stessa mappatura `?s=`. Il parametro `?s=` sull'URL
dell'hub seleziona la campagna (vale per entrambi i brand):

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

Per sviluppare/testare senza rischiare il DB condiviso (es. lavoro di schema
come le colonne `brand` o `scripts/seed-cat.ts`), punta temporaneamente a un
file locale isolato invece di `.env.local`:

```bash
TURSO_DATABASE_URL="file:./local-cat-test.db" TURSO_AUTH_TOKEN="" npm run dev
TURSO_DATABASE_URL="file:./local-cat-test.db" TURSO_AUTH_TOKEN="" npx tsx scripts/seed.ts      # contenuti dog di esempio
TURSO_DATABASE_URL="file:./local-cat-test.db" TURSO_AUTH_TOKEN="" npx tsx scripts/seed-cat.ts  # contenuti cat di esempio
```

Una variabile d'ambiente già nel processo (passata così sulla riga di
comando) **ha priorità** su quella in `.env.local`, quindi questo non
richiede di modificare o cancellare `.env.local`. `local-cat-test.db*` è in
`.gitignore` (mai committarlo, come `local.db`).

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
- Logo Cat Heroes: `public/catheroes-logo.webp` è ritagliato/ripulito dal
  wordmark raster fornito da Marco, non un SVG ufficiale — da sostituire se
  Cat Heroes fornisce un logo vettoriale.
- Cat Heroes non ha ancora un business Trustpilot né account social
  confermati: nessuno dei due è seminato da `scripts/seed-cat.ts` (si
  aggiungono da `/admin` → Social quando ci sono URL reali).
- `scripts/seed-cat.ts` non è ancora stato eseguito contro il DB condiviso
  (va fatto solo dopo merge + deploy di questa PR, vedi lo script stesso).
