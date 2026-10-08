-- Fix link hub (08/10/2026, PR #3) — ESEGUITO sul DB Turso di produzione
-- (dog-heroes-hub-viviana-alessio-dogheroes) l'08/10/2026, approvato da
-- Marco (il hub non e' ancora pubblicato, nessun utente reale lo ha visto).
--
-- Backup delle righe toccate (pre-image), preso con una SELECT prima di
-- questi UPDATE/DELETE: scripts/backup-links-2026-10-08.json.
--
-- Idempotente: ogni UPDATE/DELETE ha una WHERE sull'id + il valore attuale
-- (o sul section_id/label per le righe senza un valore "prima" stabile),
-- quindi rieseguirlo non fa danni (verificato: la seconda esecuzione da'
-- rowsAffected=0 su tutte le righe).
--
-- Eseguito via script Node (@libsql/client), non via `turso db shell`:
-- questa macchina non ha il CLI turso installato. Per rieseguirlo/
-- riprodurlo con lo stesso script, o con `turso db shell
-- dog-heroes-hub-viviana-alessio-dogheroes < scripts/fix-links-dogheroes-it.sql`
-- se il CLI e' disponibile; oppure dalla UI admin del hub (/admin/links,
-- /admin/tabs, /admin/settings) a mano.

-- 1) Hero CTA "Scopri i nostri piani" -> /pages/piano-su-misura
--    (dogheroes.com/piani era 404; /pages/piano-su-misura verificato 200).
UPDATE links
SET url = 'https://www.dogheroes.it/pages/piano-su-misura'
WHERE id = 'hero-cta-main'
  AND url = 'https://www.dogheroes.com/piani';

-- 2) "Crea il piano personalizzato" -> apre la tab Quiz INTERNA del hub,
--    non un sito esterno. Convenzione CMS aggiunta in questo PR: un link
--    con url = "#<id-tab>" (qui "#quiz") naviga a quella tab invece di
--    uscire dal hub — vedi internalTabId() in
--    src/components/hub/tabs/LinksTab.tsx e onNavigateTab in
--    src/components/hub/TabBar.tsx. Il quiz del hub manda infine al bridge
--    su https://www.dogheroes.it/pages/quiz (src/components/quiz/steps/PlanStep.tsx,
--    invariato in questo PR).
UPDATE links
SET url = '#quiz'
WHERE id = 'piano-personalizzato'
  AND url = 'https://www.dogheroes.com/quiz';

-- 2b) Riattiva la tab Quiz (era enabled=0) perche' il link sopra ora la
--     apre direttamente.
UPDATE tabs
SET enabled = 1
WHERE id = 'quiz'
  AND enabled = 0;

-- 3) "Leggi le recensioni" -> /pages/recensioni
--    (dogheroes.com/recensioni era 404; /pages/recensioni verificato 200).
UPDATE links
SET url = 'https://www.dogheroes.it/pages/recensioni'
WHERE id = 'recensioni'
  AND url = 'https://www.dogheroes.com/recensioni';

-- 4) "I nostri prodotti" (dogheroes.it/tutti-i-prodotti/): NON TOCCATO,
--    Marco lo tiene cosi' com'e'.

-- 5) Blog -> https://www.dogheroes.it/blogs/dogheroes (percorso Shopify
--    corretto; il vecchio /blog/ era il percorso WordPress pre-migrazione).
UPDATE links
SET url = 'https://www.dogheroes.it/blogs/dogheroes'
WHERE id = 'blog'
  AND url = 'https://www.dogheroes.it/blog/';

-- 6) Ambassador -> https://www.dogheroes.it/pages/ambassador-program
--    (percorso Shopify /pages/..., verificato 200).
UPDATE links
SET url = 'https://www.dogheroes.it/pages/ambassador-program'
WHERE id = 'ambassador'
  AND url = 'https://www.dogheroes.it/ambassador-program/';

-- 7) "Box prova al 30%" -> codice sconto LTREE30 (verificato ATTIVO via
--    Shopify Admin: 31% di sconto, una volta per cliente, nessuna
--    scadenza) con redirect alla pagina quiz.
--    Nota UTM: /discount/CODE fa un redirect 302 a `redirect`; il fix UTM
--    (src/lib/utm.ts, appendUTM) inserisce utm_source/utm_medium DENTRO il
--    valore di `redirect`, correttamente URL-encoded, cosi' sopravvivono
--    al redirect anche nel caso (non garantito da Shopify) in cui i
--    parametri esterni non venissero propagati. Verificato con
--    `curl -sIL`: /discount/LTREE30?redirect=%2Fpages%2Fquiz%3Futm_source...
--    -> location: https://www.dogheroes.it/pages/quiz?utm_source=linktree&utm_medium=bio.
--    L'URL salvato in DB resta quello "pulito" (senza UTM, che e' sempre
--    aggiunto a runtime dal hub); vedi anche scripts/test-utm-discount-redirect.ts.
UPDATE links
SET url = 'https://www.dogheroes.it/discount/LTREE30?redirect=/pages/quiz'
WHERE id = 'acquista-box-prova'
  AND url = 'https://www.dogheroes.it/crea?promocoupon=cibofresco3';

-- 8) Elimina il link "Trova il negozio più vicino" (Google My Maps esterna,
--    gia' disabilitato in DB): superato dal tab Store nativo (id=stores)
--    che usa lo store locator live di dogheroes.it.
DELETE FROM links
WHERE id = 'trova-negozio'
  AND url = 'https://www.google.com/maps/d/u/0/edit?mid=fMWOyCH';

-- 9) Elimina la sezione "Nuova sezione" (id be92ef89-c909-43f2-b399-3e395714b913)
--    e i suoi 2 link ("Come funziona?" e "ESPLORA"/badge "POLLO").
--    Link cancellati esplicitamente PRIMA della sezione (invece di
--    affidarsi al FOREIGN KEY ... ON DELETE CASCADE dello schema) perche'
--    PRAGMA foreign_keys non e' garantito ON sulla connessione remota.
DELETE FROM links
WHERE id = '60f78bec-a1d5-4e51-8838-2dd87502c8bf'
  AND section_id = 'be92ef89-c909-43f2-b399-3e395714b913';

DELETE FROM links
WHERE id = 'e4619d99-4da6-4224-b688-23e4deaa84be'
  AND section_id = 'be92ef89-c909-43f2-b399-3e395714b913';

DELETE FROM sections
WHERE id = 'be92ef89-c909-43f2-b399-3e395714b913'
  AND label = 'Nuova sezione'
  AND tab_id = 'links';

-- 10) settings.quiz_submit_url: dominio myshopify -> dominio canonico .it
--     (chiave orfana: PlanStep.tsx legge src/config/quiz.json, non questa
--     riga — corretta comunque per coerenza con il form admin Impostazioni).
UPDATE settings
SET value = 'https://www.dogheroes.it/pages/quiz'
WHERE key = 'quiz_submit_url'
  AND value = 'https://dogheroes-production.myshopify.com/pages/quiz';

-- NON incluso in questo script (fuori dal perimetro approvato, da
-- segnalare al coordinatore):
--  - esiste una SECONDA sezione "Nuova sezione" (id
--    79dde635-1752-41f6-b7bc-a168a948523c), vuota (nessun link), distinta
--    da quella eliminata sopra. Non renderizzata lato utente (LinksTab
--    nasconde le sezioni senza link) ma visibile come riga vuota in
--    /admin/links. Non cancellata qui: non era fra le modifiche
--    esplicitamente approvate.
