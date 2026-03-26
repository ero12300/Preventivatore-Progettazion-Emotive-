# CRM EMOTIVE (Foundation)

Nuovo progetto Next.js dedicato al CRM operativo interno.

## Stack foundation

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase JS client
- Zod
- date-fns
- TanStack React Query

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

## Variabili ambiente

Copia `.env.example` in `.env.local` e compila:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)
- `CRM_SCHEDULER_PROVIDER` (`calendly` o `calcom`)

## Migrazione Supabase (fondamenta)

Esegui lo script SQL:

`supabase/migrations/0001_crm_foundation.sql`

Include:

- enum ruoli utente
- enum stati pratica
- enum trigger workflow
- tabelle `user_profiles`, `clients`, `practices`, `activity_log`
- policy RLS iniziali

## Stato attuale

Completato il primo blocco "foundation":

- base tipizzata del dominio CRM (`src/lib/crm-types.ts`)
- regole workflow base (`src/lib/workflow-rules.ts`)
- validazione env (`src/lib/env.ts`)
- setup client Supabase browser (`src/lib/supabase/browser.ts`)
- home tecnica con overview stati/regole (`src/app/page.tsx`)

Step successivo consigliato: CRUD pratiche + cambio stato con trigger reali e scrittura `activity_log`.

## Workflow MVP operativo (implementato)

API Route Handlers:

- `GET /api/practices` lista pratiche
- `POST /api/practices` crea pratica + client + log iniziale
- `GET /api/practices/:id` dettaglio pratica
- `PATCH /api/practices/:id` update campi pratica
- `DELETE /api/practices/:id` elimina pratica
- `GET /api/designers` lista progettisti attivi
- `POST /api/practices/:id/actions/payment-received`
- `POST /api/practices/:id/actions/documentation-complete`
- `POST /api/practices/:id/actions/send-followup`
- `POST /api/practices/:id/actions/quote-accepted`
- `POST /api/jobs/followup-daily` (cron protetto con `CRON_SECRET`)

Transizioni workflow coperte:

1. `pagamento_ricevuto`
   - `preventivo_inviato` -> `in_attesa_documenti`
   - salva `payment_received_at`
   - scrive `activity_log`
2. `documentazione_completa`
   - `in_attesa_documenti` -> `rilievo_da_prenotare`
   - genera booking link scheduler stub
   - salva `booking_link_url` + timestamp
   - scrive `activity_log`

3. `send_followup` (nuovo)
   - valido solo se stato `preventivo_inviato` e non accettato
   - genera messaggio commerciale stimolante (3 stage progressivi)
   - aggiorna `followup_count`, `followup_last_sent_at`, `next_followup_at`
   - salva ultimo testo follow-up in `followup_last_message`
   - scrive `activity_log`

4. `quote_accepted` (nuovo)
   - imposta `quote_accepted_at`
   - annulla `next_followup_at`
   - blocca definitivamente ulteriori follow-up per quella pratica

## Job automatico follow-up giornaliero

Endpoint:

`POST /api/jobs/followup-daily`

Autenticazione:

- Header `Authorization: Bearer <CRON_SECRET>`
  oppure
- Header `x-cron-secret: <CRON_SECRET>`

Comportamento:

- seleziona pratiche dovute (`next_followup_at <= now`)
- solo stato `preventivo_inviato`
- solo preventivi non accettati (`quote_accepted_at is null`)
- invia follow-up e aggiorna contatori/date

Test automatici:

```bash
npm test
```
