# Preventivatore EMOTIVE - Guida Operativa

Guida unica del progetto, aggiornata per flusso cloud-first e deploy su Vercel.

## Stack

- Frontend: React + Vite
- Backend API: Express (`api/index.cjs` -> `server/index.cjs`)
- Servizi: Stripe, Gmail API, Supabase, Hugging Face (AI)
- Output: preventivo, email HTML, PDF allegato, relazione concept personalizzata

## Prerequisiti

- Node.js 18+
- Account Stripe
- Account Google Cloud con Gmail API
- Progetto Supabase
- Token Hugging Face

## Installazione locale

```bash
npm install
npm run dev
```

URL locali:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4242`

## Variabili ambiente (`.env.local`)

```env
# App
PORT=3002
STRIPE_SERVER_PORT=4242
APP_BASE_URL=http://localhost:3002

# Stripe
STRIPE_SECRET_KEY=sk_...

# Gmail
GMAIL_FROM=...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:4242/oauth2callback
GMAIL_REFRESH_TOKEN=...

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_TABLE=preventivi_progettazione_emotive
SUPABASE_SERVICE_ROLE_KEY=...

# AI (Hugging Face)
AI_PROVIDER_MODE=huggingface_only
HUGGINGFACE_API_TOKEN=hf_...
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
HUGGINGFACE_API_URL=https://router.huggingface.co/v1/chat/completions
```

Fallback opzionali:

```env
MINIMAX_API_KEY=
GEMINI_API_KEY=
```

## Setup obbligatorio

### 1) Supabase schema

Esegui in SQL Editor:

- `supabase/schema.sql`

Se il DB esiste gia, applica anche:

- `supabase/migration_add_lead_quote_fields.sql`

### 2) Gmail OAuth

```bash
npm run gmail:auth
```

## API principali

- `GET /api/health`
- `GET /api/supabase/test`
- `POST /api/leads/save`
- `POST /api/gmail/send-quote`
- `POST /api/stripe/create-checkout-session`
- `GET /api/stripe/session-status`

## Regole business attive

- Prezzo base: `990 + IVA`
- Acconto configurabile (default 30%)
- Link Stripe valido 24 ore
- IBAN: `IT69J3609201600991466031460` (`Emotive Srl`)
- Multi-categoria business salvata su Supabase (`business_categories`)

## Deploy su Vercel

Il progetto e gia predisposto con:

- `vercel.json`
- `api/index.cjs`

Passi:

1. Importa progetto su Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Inserisci le ENV del `.env.local`
5. Deploy

Test post deploy:

- `/api/health`
- `/api/supabase/test`

## Workflow veloce per integrazioni

Per fare modifiche rapide in sicurezza:

1. Crea branch feature: `git checkout -b feat/nome-modifica`
2. Modifica solo i file necessari
3. Test locale rapido:
   - `npm run build`
   - `npm run test:send-email` (quando tocchi email/PDF/backend)
4. Commit piccoli e chiari
5. Push su GitHub
6. Vercel crea preview automatica, poi promuovi in produzione

Checklist modifiche frequenti:

- Relazione AI: `server/index.cjs`
- Template email/PDF: `server/pdf-generator.cjs`
- Form e UX: `pages/CreateQuote.tsx`
- Preview preventivo: `pages/QuotePreview.tsx`
- Schema DB: `supabase/schema.sql`

## Sicurezza

- Non committare mai `.env.local`
- Ruota subito le chiavi condivise
- `SUPABASE_SERVICE_ROLE_KEY` solo lato server
# Preventivatore EMOTIVE - Guida Operativa

Guida unica del progetto, aggiornata per flusso cloud-first e deploy su Vercel.

## Stack e obiettivo

- Frontend: React + Vite
- Backend API: Express (`api/index.cjs` -> `server/index.cjs`)
- Servizi: Stripe, Gmail API, Supabase, Hugging Face (AI)
- Output: preventivo, email HTML, PDF allegato, relazione concept personalizzata

## Stato attuale del progetto

- Deploy-ready su Vercel
- Nessuna logica locale persistente richiesta per la produzione
- Salvataggio lead/preventivi su Supabase
- Link Stripe con validita 24 ore
- Relazione concept orientata a conversione: progetto -> valore -> invito a proseguire

## Prerequisiti

- Node.js 18+
- Account Stripe
- Account Google Cloud con Gmail API
- Progetto Supabase
- Token Hugging Face

## Installazione locale

```bash
npm install
npm run dev
```

Ambienti locali:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4242`

## Variabili ambiente (`.env.local`)

```env
# App
PORT=3002
STRIPE_SERVER_PORT=4242
APP_BASE_URL=http://localhost:3002

# Stripe
STRIPE_SECRET_KEY=sk_...

# Gmail
GMAIL_FROM=...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:4242/oauth2callback
GMAIL_REFRESH_TOKEN=...

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_TABLE=preventivi_progettazione_emotive
SUPABASE_SERVICE_ROLE_KEY=...

# AI (Hugging Face)
AI_PROVIDER_MODE=huggingface_only
HUGGINGFACE_API_TOKEN=hf_...
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
HUGGINGFACE_API_URL=https://router.huggingface.co/v1/chat/completions
```

Opzionale fallback AI:

```env
MINIMAX_API_KEY=
GEMINI_API_KEY=
```

## Setup iniziale obbligatorio

### 1) Supabase schema

Esegui in SQL Editor:

- `supabase/schema.sql`

Se hai un database gia avviato, applica anche:

- `supabase/migration_add_lead_quote_fields.sql`

### 2) Gmail OAuth

```bash
npm run gmail:auth
```

## API utili

- `GET /api/health`
- `GET /api/supabase/test`
- `GET /api/minimax/test` (solo test endpoint AI MiniMax)
- `POST /api/leads/save`
- `POST /api/gmail/send-quote`
- `POST /api/stripe/create-checkout-session`
- `GET /api/stripe/session-status`

## Deploy su Vercel

Il progetto e gia predisposto con:

- `vercel.json`
- `api/index.cjs`

Passi:

1. Importa progetto su Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Inserisci tutte le variabili ambiente del `.env.local`
5. Deploy

Test post deploy:

- `/api/health`
- `/api/supabase/test`

## Regole business attive

- Prezzo base progetto: `990 + IVA` (frontend)
- Acconto configurabile (default 30%)
- Validita link Stripe: 24 ore
- IBAN: `IT69J3609201600991466031460` intestato a `Emotive Srl`
- Categoria supportata: `Centro estetico luxury`
- Multi-categoria business salvata su Supabase (`business_categories`)

## Relazione concept AI (importante)

Obiettivo:

- testo breve, premium, concreto
- personalizzato su cliente/tipologia/mq/localita
- ordine logico: progetto -> valore strategico -> invito a proseguire

Guardrail attivi:

- rimozione placeholder tipo `[Nome Cliente]`
- rimozione firme automatiche inutili
- fallback personalizzato se provider AI non risponde

## Pulizia documentazione

- Questa e la guida ufficiale.
- `README.md` e mantenuto volutamente minimale come indice.

## File chiave per modifiche future

- Logica backend: `server/index.cjs`
- Template email/PDF: `server/pdf-generator.cjs`
- Form preventivo: `pages/CreateQuote.tsx`
- Preview preventivo: `pages/QuotePreview.tsx`
- Schema DB: `supabase/schema.sql`
- Deploy config: `vercel.json`

## Note sicurezza

- Non committare mai `.env.local`
- Ruota subito le chiavi se sono state condivise
- `SUPABASE_SERVICE_ROLE_KEY` solo lato server
# PREVENTIVATORE EMOTIVE - Versione Semplificata

## 📋 Panoramica

Il Preventivatore EMOTIVE è stato completamente riprogettato per essere un **sistema semplice e diretto** per creare preventivi personalizzati.

### ✅ Funzionalità Incluse:
- **Creazione preventivo personalizzato** con prezzo e acconto configurabili
- **Generazione PDF professionale** con branding EMOTIVE
- **Invio automatico via email** con Gmail
- **Pagamento online** tramite Stripe
- **Salvataggio lead** su Supabase (cloud)
- **Sincronizzazione cloud Supabase** con tutti i campi lead/preventivo
- **Relazione concept AI (MiniMax)** con fallback automatico
- **Design responsive** e professionale mantenuto

### ❌ Funzionalità Rimosse:
- Dashboard amministratore interna
- Componenti non necessari (HowItWorks legacy)

---

## 🚀 Installazione

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Configura le variabili d'ambiente

Crea un file `.env.local` nella root del progetto:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...  # La tua chiave segreta Stripe
EMOTIVE_DEPOSIT_EUR_CENTS=91134  # Importo acconto in centesimi (default: 911.34€)
STRIPE_SERVER_PORT=4242

# Gmail (per invio email)
GMAIL_FROM=tua-email@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# URL base app (per redirect Stripe dopo il pagamento)
APP_BASE_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_TABLE=preventivi_progettazione_emotive
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MiniMax (relazione concept live)
MINIMAX_API_KEY=sk-api-...
MINIMAX_API_URL=https://api.minimax.chat/v1/text/chatcompletion_v2
MINIMAX_MODEL=MiniMax-Text-01
```

### 3. Configura Gmail OAuth (opzionale)

Se vuoi usare l'invio email automatico:

```bash
npm run gmail:auth
```

Segui le istruzioni per autorizzare l'accesso Gmail.

### 4. Configura Supabase (obbligatorio se vuoi salvataggio cloud)

1. Apri Supabase SQL Editor
2. Esegui lo script: `supabase/schema.sql`
3. Verifica che esista la tabella: `preventivi_progettazione_emotive`

### 5. Avvia l'applicazione

```bash
npm run dev
```

Questo avvierà:
- **Client** (Vite + React): http://localhost:5173
- **Server** (Express + Stripe): http://localhost:4242

### 6. Deploy Vercel (già predisposto)

Il progetto è pronto con:
- `vercel.json` (routing frontend + backend serverless)
- `api/index.cjs` (entrypoint API su Vercel)
- backend già impostato in modalità cloud-first (niente storage locale su file)

Passi deploy:
1. Importa repository/progetto su Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Aggiungi in Vercel tutte le ENV del `.env.local`
5. Deploy

Test veloci post deploy:
- `/api/health`
- `/api/supabase/test`
- `/api/minimax/test`

---

## 📖 Come Funziona

### Flusso Utente:

1. **Home Page** → L'utente visualizza la landing page EMOTIVE
2. **Crea Preventivo** → Clicca su "Crea Preventivo" per iniziare
3. **Form in 3 Step**:
   - **Step 1**: Dati progetto (tipo locale, città, mq, descrizione)
   - **Step 2**: Dati cliente (nome, email, telefono, azienda, P.IVA)
   - **Step 3**: Prezzo personalizzato (prezzo totale + percentuale acconto)
4. **Preview Preventivo** → Visualizza il preventivo completo con tutti i dettagli
5. **Azioni disponibili**:
   - **Modifica Preventivo**: Torna al form per modificare i dati
   - **Invia Email**: Invia il preventivo PDF via email al cliente
   - **Paga con Stripe**: Reindirizza a Stripe Checkout per il pagamento dell'acconto
   - **Ho già pagato**: Passa alla pagina di successo
6. **Success Page** → Conferma dell'attivazione e prossimi passi

---

## 💰 Personalizzazione Prezzi

### Nel Form (Step 3):

L'utente (tu) inserisce:
- **Prezzo Totale** (es. 990.00 €)
- **Percentuale Acconto** (es. 30%)

Il sistema calcola automaticamente:
- **Acconto Base**: `Prezzo Totale × (Percentuale / 100)`
- **IVA Acconto**: `Acconto Base × 0.22`
- **Acconto Totale**: `Acconto Base + IVA Acconto`
- **Saldo Rimanente**: `(Prezzo Totale - Acconto Base) × 1.22`

### Esempio:
- Prezzo Totale: **990,00 €**
- Percentuale Acconto: **30%**

Calcoli:
- Acconto Base: 297,00 €
- IVA (22%): 65,34 €
- **Acconto Totale: 362,34 €**
- **Saldo Rimanente: 845,46 €**

---

## 📧 Invio Email

### Contenuto Email:

L'email include:
- **HTML professionale** compatibile con tutti i client email
- **PDF allegato** del preventivo
- **Link Stripe** per pagamento diretto (se configurato)
- **IBAN** per bonifico bancario
- **Contatti WhatsApp e telefono**
- **Relazione Concept live** generata da MiniMax 2.7 (con fallback automatico se API non disponibile)

### Test connessione MiniMax:

- Endpoint server: `GET /api/minimax/test`
- Se la chiave/API non sono valide il sistema non si blocca: usa fallback automatico.

### Test connessione Supabase:

- Endpoint server: `GET /api/supabase/test`
- Se la tabella non esiste o le chiavi sono errate, l'endpoint restituisce l'errore dettagliato.

### File Generati:

- `pdf-generator.cjs`: Genera HTML email e PDF preventivo

---

## 💳 Pagamento Stripe

### Configurazione:

1. Crea un account su [Stripe](https://stripe.com)
2. Ottieni le chiavi API (Dashboard → Developers → API keys)
3. Inserisci `STRIPE_SECRET_KEY` nel file `.env.local`
4. L'importo viene calcolato automaticamente dal prezzo e percentuale inseriti

### Flusso Pagamento:

1. Cliente clicca "PAGA ORA" nel preventivo (o usa il link nell'email)
2. Viene creato un **link di pagamento** valido **24 ore**
3. Il link reindirizza a Stripe Checkout; il cliente inserisce i dati della carta
4. Stripe elabora il pagamento
5. Redirect alla Success Page con conferma

Dopo 24 ore il link mostra "Link scaduto" e il cliente deve richiedere un nuovo link.

---

## 💾 Database Lead

I lead vengono salvati automaticamente su Supabase (`preventivi_progettazione_emotive`).

### Struttura Lead:

```json
{
  "leads": [
    {
      "id": "1706023456789",
      "timestamp": "2026-01-28T10:30:45.123Z",
      "clientName": "Mario Rossi",
      "email": "mario@example.com",
      "phone": "+39 123 456 7890",
      "businessType": "Ristorante / Bistrot",
      "location": "Milano",
      "squareMeters": "120",
      "companyName": "Rossi S.r.l.",
      "vatNumber": "12345678901",
      "address": "Via Roma 1, Milano",
      "totalPrice": 990,
      "depositPercentage": 30,
      "status": "pending"
    }
  ]
}
```

### Endpoint API:

- `POST /api/leads/save`: Salva un nuovo lead
- `POST /api/gmail/send-quote`: Genera PDF + invia email + sincronizza Supabase
- `GET /api/supabase/test`: Test connessione Supabase
- `GET /api/minimax/test`: Test connessione MiniMax

Numerazione automatica:
- `leadNumber` formato `LEAD-ANNO-######` su `POST /api/leads/save`
- `quoteNumber` formato `PREV-ANNO-######` su `POST /api/gmail/send-quote`
- `business_categories` salvato su Supabase (array JSON)

---

## 🎨 Personalizzazione Stile

Lo stile EMOTIVE è mantenuto intatto:

### Colori Brand:
- **Oro**: `#c5a059` (brand-gold)
- **Nero**: `#050505` (brand-dark)
- **Bianco**: `#fcfcfc`

### Font:
- **Sans-serif**: Inter (per testi)
- **Serif**: Playfair Display (per titoli)

### Componenti:
- `index.html`: Contiene gli stili globali CSS
- `App.tsx`: Layout principale
- `pages/`: Pagine dell'applicazione
- `components/`: Componenti riutilizzabili (Header)

---

## 🔧 Struttura Progetto

```
.
├── pages/
│   ├── Home.tsx              # Landing page
│   ├── CreateQuote.tsx       # Form creazione preventivo (3 step)
│   ├── QuotePreview.tsx      # Preview preventivo + azioni
│   └── Success.tsx           # Pagina conferma pagamento
│
├── components/
│   └── Header.tsx            # Header navigazione
│
├── server/
│   ├── index.cjs             # Server Express + API
│   ├── pdf-generator.cjs     # Generatore PDF e HTML email
│   ├── gmail.cjs             # Invio email Gmail
│   └── gmail-auth.cjs        # Autenticazione Gmail OAuth
│
├── types.ts                  # TypeScript types
├── App.tsx                   # App principale
├── index.tsx                 # Entry point React
├── index.html                # HTML template
├── package.json              # Dipendenze
└── .env.local               # Variabili ambiente (da creare)
```

---

## 🐛 Troubleshooting

### Errore Stripe non configurato:
```
Stripe non configurato: STRIPE_SECRET_KEY assente
```
**Soluzione**: Aggiungi `STRIPE_SECRET_KEY` nel file `.env.local`

### Errore Gmail non autorizzato:
```
Errore invio Gmail
```
**Soluzione**: Esegui `npm run gmail:auth` per autorizzare Gmail

### Porta già in uso:
```
Error: listen EADDRINUSE: address already in use :::4242
```
**Soluzione**: Cambia `STRIPE_SERVER_PORT` in `.env.local` o termina il processo sulla porta 4242

### PDF non generato:
**Soluzione**: Verifica che Puppeteer sia installato correttamente:
```bash
npm install puppeteer
```

---

## 📝 Note Importanti

1. **Prezzo IVA**: L'IVA del 22% è applicata automaticamente sull'acconto e sul saldo
2. **IBAN**: Aggiorna l'IBAN nel file `server/pdf-generator.cjs` se necessario
3. **Validità Offerta**: Offerta commerciale 15 giorni; link pagamento via backend attualmente 24 ore
4. **Backup Database**: usa export/backup direttamente da Supabase
5. **Sicurezza**: Non committare mai `.env.local` nel repository Git
6. **Credenziali esposte**: se hai condiviso service keys/API keys in chat o file, ruotale da dashboard provider

## 🔧 Modifiche future rapide

- Prezzo default: `App.tsx` e `pages/CreateQuote.tsx`
- Fasi progetto: `pages/QuotePreview.tsx` + `server/pdf-generator.cjs`
- Dati pagamento/IBAN: `server/index.cjs` + `server/pdf-generator.cjs`
- Tabella cloud: `supabase/schema.sql`
- Endpoint backend: `server/index.cjs` (in Vercel passa da `api/index.cjs`)

---

## 🎯 Prossimi Sviluppi (Opzionali)

- Dashboard amministratore per gestire lead
- Export CSV dei lead
- Statistiche e analytics
- Template preventivo multipli
- Invio email automatico di follow-up
- Integrazione CRM

---

## 📞 Contatti

**EMOTIVE Studio**
- Website: www.emotivedesign.it
- Partnership: BONCORDO | Arredi Commerciali - www.boncordoarredi.it

---

**Buon Lavoro! 🚀**
