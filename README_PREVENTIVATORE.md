# Preventivatore Progettazione Emotive

Guida unica, aggiornata e operativa del progetto.

Obiettivo: gestire preventivi progettazione in modo automatico, con pricing dinamico su mq, invio email/PDF, gestione admin e sistema partner con commissioni.

---

## 1) Panoramica del sistema

Il progetto e composto da:

- **Frontend React + Vite**
  - form preventivo
  - preview preventivo
  - auth portal (magic link)
  - mini admin pricing
  - dashboard partner
- **Backend Express (`server/index.cjs`)**
  - calcolo pricing dinamico da database
  - invio email Gmail con PDF
  - integrazione Stripe payment link
  - salvataggio dati in Supabase + Airtable
  - gestione referral e commissioni partner
- **Database Supabase**
  - tabella principale preventivi
  - tabelle pricing/sconti/referral
  - tabelle auth/partner/commissioni

---

## 2) Funzioni principali

### Cliente finale

- Inserisce dati progetto e cliente
- Inserisce **mq obbligatori**
- Ottiene prezzo automatico dalla fascia mq
- Riceve preventivo via email con PDF
- Può pagare acconto via Stripe

### Admin

- Gestisce fasce prezzi senza toccare codice
- Gestisce codici sconto e referral
- Può usare override manuale prezzo (protetto)

### Partner/Venditori

- Accedono via magic link email
- Vedono dashboard commissioni
- Ogni referral può generare commissione automatica
- Notifica email automatica quando il loro codice viene usato
- Notifica email quando la commissione passa a `paid`

### Payout partner (bonifico o carta)

Il sistema supporta:

- `bank_transfer` (bonifico manuale con riferimento CRO/TRN)
- `manual_card` (pagamento carta esterno con riferimento transazione)
- `stripe_connect` (payout automatico verso account collegato Stripe)

Per sicurezza non vengono mai salvati dati carta grezzi nel database.
La modalità carta diretta passa da Stripe Connect o da pagamento esterno con solo riferimento transazione.

---

## 3) Pricing dinamico su mq

Le fasce sono salvate su DB (non hardcoded).

Esempio listino standard:

- 0-69 mq => 749 EUR + IVA
- 70-99 mq => 849 EUR + IVA
- 100-149 mq => 1050 EUR + IVA
- 150-199 mq => 1250 EUR + IVA
- 200-249 mq => 1450 EUR + IVA
- 250-299 mq => 1650 EUR + IVA
- 300-500 mq => 1850 EUR + IVA

Endpoint di calcolo:

- `POST /api/pricing/calculate`

Input supportati:

- `squareMeters` (obbligatorio)
- `discountCode` (opzionale)
- `referralCode` (opzionale)
- `manualOverridePrice` (solo admin + secret)

---

## 4) Auth e ruoli

Auth usa Supabase (magic link email).

Ruoli:

- `admin`
- `partner`
- `unknown` (non autorizzato)

Pagine:

- `#auth-portal` -> login/logout
- `#admin-pricing` -> solo admin
- `#partner-dashboard` -> solo partner

---

## 5) Struttura database (Supabase)

### Pricing

- `pricing_rules_emotive`
- `pricing_discount_codes`
- `pricing_referral_rules`

### Core preventivi

- `preventivi_progettazione_emotive`

### Partner/Auth

- `user_profiles`
- `partners`
- `partner_referrals`
- `partner_commissions`
- estensione payout: `supabase/migration_partner_payouts.sql`

---

## 6) Migrazioni SQL da eseguire

Nel Supabase SQL Editor eseguire, in ordine:

1. `supabase/migration_dynamic_pricing_engine.sql`
2. `supabase/migration_auth_partner_portal.sql`
3. `supabase/migration_partner_payouts.sql`

Se non esegui entrambe, alcune funzioni (es. commissioni partner) non si attivano.

---

## 7) Variabili ambiente richieste

### Backend core

- `STRIPE_SECRET_KEY`
- `STRIPE_SERVER_PORT`
- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE`
- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

### Gmail

- `GMAIL_FROM`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_REFRESH_TOKEN`

### AI

- `AI_PROVIDER_MODE`
- `HUGGINGFACE_API_TOKEN`
- `HUGGINGFACE_MODEL`
- `HUGGINGFACE_API_URL`

### Frontend Auth

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Sicurezza admin

- `ADMIN_PRICING_SECRET`

### Opzionali tabella custom

- `PRICING_RULES_TABLE`
- `DISCOUNT_CODES_TABLE`
- `REFERRAL_RULES_TABLE`
- `PARTNERS_TABLE`
- `PARTNER_REFERRALS_TABLE`
- `PARTNER_COMMISSIONS_TABLE`

### Endpoint payout admin (nuovi)

- `POST /api/admin/partners/stripe-connect/onboarding-link`
- `POST /api/admin/partner-commissions/pay`

---

## 8) Avvio locale

Installazione:

```bash
npm install
```

Dev completo (frontend + backend):

```bash
npm run dev
```

Solo backend:

```bash
npm run dev:server
```

Build:

```bash
npm run build
```

Test invio completo email/PDF:

```bash
npm run test:send-email
```

---

## 9) Flusso operativo consigliato

1. Aggiorni codice
2. Test locale (`npm run build`, eventuale `npm run test:send-email`)
3. Pubblichi con:

```bash
npm run ship -- --skip-env-check --msg="descrizione modifica"
```

---

## 10) Deploy Vercel

Il progetto e già configurato su Vercel.

Produzione attuale:

- `https://emotive-preventivatore-progettazion.vercel.app`

Per deploy manuale:

```bash
npx vercel --prod --yes
```

---

## 11) Dominio personalizzato senza toccare Softr

Per tenere il sito Softr (`www.emotivedesign.it`) separato:

- usare sottodominio dedicato per app Vercel
- esempio: `preventivatore.emotivedesign.it`

In GoDaddy creare record DNS:

- Tipo: `A`
- Host: `preventivatore`
- Value: `76.76.21.21`

Questo non modifica `www` e non interrompe Softr.

---

## 12) Come guadagnano i venditori

Ogni partner ha un codice (es. `LUIGI23`).

Quando un preventivo viene attribuito al referral:

- si crea riga in `partner_referrals`
- si crea commissione in `partner_commissions`
- stato iniziale: `pending`

Formula commissione:

- `amount_eur = total_price_ex_vat * commission_percent / 100`

Esempio test reale:

- prezzo 1050 EUR
- commissione 7%
- payout pending 73.50 EUR

---

## 13) Sicurezza

- Non committare mai `.env.local`
- Ruotare immediatamente chiavi/token condivisi per errore
- Service role key solo backend
- `ADMIN_PRICING_SECRET` lungo e non condiviso

---

## 14) Troubleshooting rapido

### `Could not find table ... in schema cache`

Manca migrazione SQL o non è stata applicata correttamente.

### `invalid_grant` Gmail

Refresh token non valido/mismatch client OAuth.

### `Stripe non configurato`

Chiave `STRIPE_SECRET_KEY` mancante o non valida.

### Admin non autorizzato

`ADMIN_PRICING_SECRET` non impostato o header errato.

---

## 15) File principali

- `server/index.cjs` -> logica backend principale
- `pages/CreateQuote.tsx` -> form preventivo
- `pages/QuotePreview.tsx` -> preview e invio
- `pages/AdminPricing.tsx` -> gestione prezzi/sconti/referral
- `pages/AuthPortal.tsx` -> login magic link
- `pages/PartnerDashboard.tsx` -> vista commissioni partner
- `lib/supabase.ts` -> client auth frontend
- `supabase/migration_dynamic_pricing_engine.sql`
- `supabase/migration_auth_partner_portal.sql`

---

## 16) Roadmap breve consigliata

- filtro anti-frode referral (self-referral, dedup email/telefono)
- audit log admin modifiche pricing
- notifica automatica partner quando commissione passa a `approved`/`paid`
- report mensile commissioni (csv)

