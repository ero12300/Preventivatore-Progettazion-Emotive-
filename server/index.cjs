const path = require('path');
const express = require('express');
const Stripe = require('stripe');
const dotenv = require('dotenv');
const Airtable = require('airtable');
const { sendGmailText, sendGmailHtml } = require('./gmail.cjs');
const { generateQuoteHTML, generateQuotePDF } = require('./pdf-generator.cjs');

// Carica variabili da .env.local (ignorato da git) e fallback .env
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripe =
  STRIPE_SECRET_KEY && /^sk_(test|live)_/.test(STRIPE_SECRET_KEY)
    ? new Stripe(STRIPE_SECRET_KEY)
    : null;
if (!stripe) {
  const got = typeof STRIPE_SECRET_KEY === 'string' && STRIPE_SECRET_KEY.length > 0 ? 'presente-ma-non-valida' : 'assente';
  console.warn(
    `Stripe non configurato: STRIPE_SECRET_KEY ${got}. Deve iniziare con sk_test_... o sk_live_.... Il server resta avviabile, ma il checkout non funzionerà.`
  );
}

const app = express();
app.use(express.json());

const port = Number(process.env.STRIPE_SERVER_PORT || 4242);
const PAYMENT_LINK_VALID_HOURS = 24;

// Configurazione Airtable
const AIRTABLE_TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
const AIRTABLE_BASE_ID = (process.env.AIRTABLE_BASE_ID || 'app20MDmIqa5SoxRO').trim();
const AIRTABLE_TABLE_NAME = (process.env.AIRTABLE_TABLE_NAME || 'tblGm3YGvNgZFnKfM').trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_TABLE = (process.env.SUPABASE_TABLE || 'preventivi_progettazione_emotive').trim();
const MINIMAX_API_KEY = (process.env.MINIMAX_API_KEY || '').trim();
const MINIMAX_API_URL = (process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2').trim();
const MINIMAX_MODEL = (process.env.MINIMAX_MODEL || 'MiniMax-Text-01').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
const HUGGINGFACE_API_TOKEN = (process.env.HUGGINGFACE_API_TOKEN || process.env.HF_API_TOKEN || '').trim();
const HUGGINGFACE_MODEL = (process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct').trim();
const HUGGINGFACE_API_URL = (process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1/chat/completions').trim();
const AI_PROVIDER_MODE = (process.env.AI_PROVIDER_MODE || 'huggingface_only').trim().toLowerCase();

let airtableBase = null;
if (AIRTABLE_TOKEN && AIRTABLE_BASE_ID) {
  try {
    Airtable.configure({ apiKey: AIRTABLE_TOKEN });
    airtableBase = Airtable.base(AIRTABLE_BASE_ID);
    console.log('✅ Airtable configurato correttamente');
  } catch (err) {
    console.warn('⚠️ Errore configurazione Airtable:', err.message);
  }
} else {
  console.warn('⚠️ Airtable non configurato (token o base ID mancanti)');
}

// Funzione per salvare cliente in Airtable
async function saveToAirtable(data) {
  if (!airtableBase) {
    console.warn('⚠️ Airtable non configurato, skip salvataggio');
    return null;
  }

  try {
    const record = await airtableBase(AIRTABLE_TABLE_NAME).create([
      {
        fields: {
          'Name': data.firstName || '',
          'Cognome': data.lastName || '',
          'Telefono': data.phone || '',
          'Email': data.email || '',
          'Richiesta': data.businessType || ''
        }
      }
    ]);

    console.log(`✅ Cliente salvato in Airtable: ${data.firstName} ${data.lastName} (ID: ${record[0].id})`);
    return record[0].id;
  } catch (err) {
    console.error('❌ Errore salvataggio Airtable:', err.message);
    return null;
  }
}

function nextSequenceCode(type) {
  const year = String(new Date().getFullYear());
  const prefix = type === 'quote' ? 'PREV' : 'LEAD';
  return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function parseBusinessCategories(businessType) {
  if (typeof businessType !== 'string') return [];
  return businessType
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function upsertSupabaseRecord(record) {
  if (!isSupabaseConfigured()) {
    return { ok: false, skipped: true, reason: 'Supabase non configurato' };
  }

  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=app_id`;
  const payload = {
    app_id: record.app_id || '',
    event_type: record.event_type || '',
    quote_number: record.quote_number || '',
    lead_number: record.lead_number || '',
    status: record.status || '',
    first_name: record.first_name || '',
    last_name: record.last_name || '',
    client_name: record.client_name || '',
    email: record.email || '',
    phone: record.phone || '',
    business_type: record.business_type || '',
    business_categories: Array.isArray(record.business_categories) ? record.business_categories : [],
    location: record.location || '',
    square_meters: record.square_meters || '',
    company_name: record.company_name || '',
    vat_number: record.vat_number || '',
    address: record.address || '',
    project_description: record.project_description || '',
    total_price: Number(record.total_price || 0),
    deposit_percentage: Number(record.deposit_percentage || 0),
    deposit_total: Number(record.deposit_total || 0),
    remaining_total: Number(record.remaining_total || 0),
    stripe_url: record.stripe_url || '',
    payment_link_expires_at: record.payment_link_expires_at || null,
    source: record.source || 'preventivatore',
    lead_source: record.lead_source || 'web_form',
    funnel_step: record.funnel_step || '',
    notes: record.notes || '',
    metadata: record.metadata || {},
    timestamp_utc: record.timestamp_utc || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert fallito (${response.status}): ${text.slice(0, 300)}`);
  }

  return { ok: true };
}

function pickConceptVariant(quoteNumber) {
  const mode = (process.env.CONCEPT_VARIANT_MODE || 'ab').toLowerCase();
  if (mode === 'premium_a') return 'premium_a';
  if (mode === 'premium_b') return 'premium_b';
  const num = Number(String(quoteNumber || '').match(/(\d+)$/)?.[1] || Date.now());
  return num % 2 === 0 ? 'premium_a' : 'premium_b';
}

function buildMiniMaxPrompt({ clientName, businessType, location, squareMeters, projectDescription, variant = 'premium_a' }) {
  const toneHint =
    variant === 'premium_b'
      ? 'Tono ancora piu emozionale, evocativo e orientato all immaginario premium.'
      : 'Tono premium equilibrato, elegante e orientato alla decisione.';
  return `
Scrivi una Relazione Concept breve ma ad alto impatto per convincere il cliente a proseguire con il Protocollo EMOTIVE.
Stile: chiaro, premium, concreto, zero frasi standard.
Lunghezza: 110-160 parole.
Lingua: italiano.
Indicazione stile: ${toneHint}
Vincoli:
- no elenchi puntati
- tono consulenziale-commerciale di alto livello
- struttura obbligatoria in 3 blocchi: 1) scenario progetto 2) valore strategico + attenzione 3) invito a proseguire
- niente promesse assolute
- personalizza in modo specifico su tipologia, localita e metratura
- includi 1 punto forte e 1 attenzione prioritaria della tipologia
- cita marketing e posizionamento in modo sintetico
- chiudi con call to action forte e concreta per confermare avvio Protocollo EMOTIVE
- non inserire firme, saluti finali, ruolo o contatti
- non usare placeholder o parentesi quadre (esempio vietato: [Nome Cliente])
- non inventare nomi di brand, locale o progetto (esempio vietato: "Nome Luxury")
- non rinominare il progetto: usa solo i dati forniti nel brief
- apri il testo nominando il cliente in modo naturale: "Per ${clientName || 'il cliente'}"

Dati progetto:
- Cliente: ${clientName || 'non specificato'}
- Tipologia: ${businessType || 'non specificata'}
- Localita: ${location || 'non specificata'}
- Superficie: ${squareMeters || 'non specificata'} mq
- Descrizione cliente: ${projectDescription || 'non specificata'}
  `.trim();
}

function buildPersonalizedFallbackConceptReport({ clientName, businessType, location, squareMeters, projectDescription, variant = 'premium_a' }) {
  const type = (businessType || 'attivita commerciale').toLowerCase();
  const name = clientName || 'il cliente';
  const city = location || 'la localita di riferimento';
  const area = squareMeters ? `${squareMeters} mq` : 'una metratura da confermare';
  const briefing = projectDescription || 'brief iniziale del progetto';

  let strengths = '';
  let attention = '';

  if (type.includes('estetic')) {
    strengths =
      "Per un centro estetico luxury, il punto forte e trasformare ogni trattamento in esperienza premium percepita fin dall accoglienza.";
    attention =
      "L attenzione prioritaria e garantire privacy e comfort sensoriale, mantenendo flussi operativi ordinati.";
  } else if (type.includes('ristor') || type.includes('bistrot') || type.includes('bar') || type.includes('pastic')) {
    strengths =
      "Per un format food & beverage, il punto forte e rendere memorabile l esperienza cliente aumentando valore percepito e ritorno.";
    attention =
      "L attenzione prioritaria e ottimizzare i flussi di servizio nelle ore di punta per sostenere performance e reputazione.";
  } else {
    strengths =
      "Il punto forte e costruire uno spazio coerente con il brand, capace di comunicare valore in modo immediato.";
    attention =
      "L attenzione prioritaria e allineare estetica, funzionalita e posizionamento per evitare dispersioni di budget.";
  }

  const closing =
    variant === 'premium_b'
      ? "Se senti che questa visione rappresenta davvero il potenziale della tua attivita, questo e il momento giusto per proseguire con EMOTIVE e trasformare l idea in un progetto distintivo, pronto a lasciare un segno concreto nel tuo mercato."
      : "Se condividi questa direzione, il passo successivo e procedere con il percorso EMOTIVE per trasformare la visione in un progetto esecutivo concreto, distintivo e pronto a generare risultati.";

  return `Per ${name}, il progetto ${businessType || 'commerciale'} a ${city}${squareMeters ? ` (${area})` : ''} ha il potenziale per diventare un riferimento riconoscibile nel suo segmento, a partire da ${briefing}. ${strengths} ${attention} In parallelo, progettazione e marketing devono essere coerenti: identita visiva, esperienza cliente e posizionamento devono comunicare lo stesso valore premium. ${closing}`;
}

function sanitizeConceptReport(text, clientName, businessType) {
  if (typeof text !== 'string') return '';
  const fallbackName = clientName || 'il cliente';
  const fallbackBusinessType = businessType || 'attivita';
  return text
    .replace(/\[Nome Cliente\]/gi, fallbackName)
    .replace(/\[Il tuo nome\]/gi, '')
    .replace(/\[Il tuo ruolo\]/gi, '')
    .replace(/\[Il tuo contatto\]/gi, '')
    .replace(/\bprogetto\s+["“][^"”]+["”]/gi, `progetto ${fallbackBusinessType}`)
    .replace(/\b[A-Z][a-z]+ Luxury\b/g, fallbackBusinessType)
    .replace(/Cordiali saluti[,:\s]*/gi, '')
    .trim();
}

async function generateMiniMaxConceptReport(input) {
  if (!MINIMAX_API_KEY) {
    return {
      text: buildPersonalizedFallbackConceptReport(input),
      source: 'fallback-no-key',
    };
  }

  const response = await fetch(MINIMAX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Sei un consulente senior di concept design per hospitality e retail.',
        },
        {
          role: 'user',
          content: buildMiniMaxPrompt(input),
        },
      ],
      temperature: 0.55,
      max_tokens: 900,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MiniMax HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`MiniMax risposta non JSON: ${text.slice(0, 300)}`);
  }

  const generated =
    parsed?.choices?.[0]?.message?.content ||
    parsed?.choices?.[0]?.text ||
    parsed?.reply ||
    '';

  if (!generated || typeof generated !== 'string') {
    throw new Error('MiniMax non ha restituito testo nella risposta.');
  }

    return { text: generated.trim(), source: 'minimax-live' };
}

async function generateGeminiConceptReport(input) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY assente');
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildMiniMaxPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1000,
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini risposta non JSON: ${text.slice(0, 300)}`);
  }

  const generated =
    parsed?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('\n').trim() || '';

  if (!generated) {
    throw new Error('Gemini non ha restituito testo.');
  }
  return { text: generated, source: 'gemini-live' };
}

async function generateHuggingFaceConceptReport(input) {
  if (!HUGGINGFACE_API_TOKEN) {
    throw new Error('HUGGINGFACE_API_TOKEN assente');
  }

  const preferredModels = [
    HUGGINGFACE_MODEL,
    'meta-llama/Llama-3.3-70B-Instruct',
    'meta-llama/Llama-3.1-70B-Instruct',
    'meta-llama/Llama-3.1-8B-Instruct',
  ].filter(Boolean);
  const modelsToTry = [...new Set(preferredModels)];
  let lastError = null;

  for (const model of modelsToTry) {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HUGGINGFACE_API_TOKEN}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sei un consulente premium di concept design commerciale.',
          },
          {
            role: 'user',
            content: buildMiniMaxPrompt(input),
          },
        ],
        temperature: 0.6,
        max_tokens: 700,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      lastError = new Error(`HuggingFace ${model} HTTP ${response.status}: ${text.slice(0, 220)}`);
      continue;
    }

    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      lastError = new Error(`HuggingFace ${model} risposta non JSON`);
      continue;
    }

    const generated =
      parsed?.choices?.[0]?.message?.content ||
      parsed?.choices?.[0]?.text ||
      parsed?.generated_text ||
      '';

    if (generated && typeof generated === 'string') {
      return { text: generated.trim(), source: `huggingface-live:${model}` };
    }
    lastError = new Error(`HuggingFace ${model} non ha restituito testo`);
  }

  throw lastError || new Error('HuggingFace non disponibile');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/supabase/test', async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        ok: false,
        configured: false,
        message: 'Configura SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local',
      });
    }

    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=id,app_id,created_at&order=id.desc&limit=1`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    const text = await response.text();
    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        configured: true,
        message: `Supabase test fallito (${response.status})`,
        details: text.slice(0, 300),
      });
    }

    let rows = [];
    try {
      rows = JSON.parse(text);
    } catch {
      rows = [];
    }

    return res.json({
      ok: true,
      configured: true,
      table: SUPABASE_TABLE,
      sample: Array.isArray(rows) ? rows[0] || null : null,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      configured: isSupabaseConfigured(),
      message: err?.message || 'Errore test Supabase',
    });
  }
});

app.get('/api/minimax/test', async (_req, res) => {
  try {
    const result = await generateMiniMaxConceptReport({
      businessType: 'Ristorante contemporaneo',
      location: 'Milano',
      squareMeters: '120',
      projectDescription: 'locale con forte focus su esperienza serale e alta rotazione tavoli',
    });
    res.json({
      ok: true,
      source: result.source,
      preview: result.text.slice(0, 240),
      model: MINIMAX_MODEL,
      endpoint: MINIMAX_API_URL,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Errore test MiniMax',
      model: MINIMAX_MODEL,
      endpoint: MINIMAX_API_URL,
      hasKey: Boolean(MINIMAX_API_KEY),
    });
  }
});

function getBaseUrl(req) {
  // In dev con Vite proxy arriva l'Origin del browser
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) return origin.replace(/\/$/, '');

  // Fallback per deploy
  if (process.env.APP_BASE_URL) return String(process.env.APP_BASE_URL).replace(/\/$/, '');

  // Ultimo fallback
  const clientPort = process.env.PORT || 3000;
  return `http://localhost:${clientPort}`;
}

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe non configurato. Imposta STRIPE_SECRET_KEY in .env.local (sk_test_... o sk_live_...).');
    }

    const { email, clientName, businessType, location, depositTotal, totalPrice, depositPercentage } = req.body || {};

    const amountCents = Math.round((depositTotal || 0) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).send('Importo acconto non valido.');
    }

    const baseUrl = getBaseUrl(req);

    // Payment Link Stripe; il link restituito scade dopo 24 ore
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: 'Acconto Protocollo EMOTIVE®',
              description: `Attivazione (${depositPercentage}% + IVA) - ${clientName || 'Cliente'}`,
            },
          },
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}#success`,
        },
      },
      metadata: {
        clientName: typeof clientName === 'string' ? clientName : '',
        businessType: typeof businessType === 'string' ? businessType : '',
        location: typeof location === 'string' ? location : '',
        totalPrice: String(totalPrice || ''),
        depositPercentage: String(depositPercentage || ''),
      },
    });

    return res.json({ url: paymentLink.url });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore creazione link pagamento Stripe.');
  }
});

app.get('/api/stripe/session-status', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe non configurato. Imposta STRIPE_SECRET_KEY in .env.local (sk_test_... o sk_live_...).');
    }

    const sessionId = req.query.session_id;
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return res.status(400).send('session_id non valido.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email || session.customer_email || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore verifica sessione Stripe.');
  }
});

app.post('/api/gmail/send-quote', async (req, res) => {
  try {
    const { 
      to,
      firstName,
      lastName, 
      clientName, 
      companyName, 
      vatNumber, 
      address,
      businessType, 
      location, 
      squareMeters, 
      projectDescription,
      totalPrice,
      depositPercentage,
      depositTotal,
      remainingTotal
    } = req.body || {};
    
    if (typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).send('Campo "to" non valido.');
    }

    const iban = 'IT69J3609201600991466031460';
    
    const fullName = clientName || `${firstName || ''} ${lastName || ''}`.trim();
    const businessCategories = parseBusinessCategories(businessType);
    const quoteNumber = nextSequenceCode('quote') || `PREV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const conceptVariant = pickConceptVariant(quoteNumber);
    const subject = `[${quoteNumber}] Preventivo EMOTIVE - ${businessType || 'Nuovo Progetto'} - ${fullName}`;
    
    // Crea oggetto preventivo completo
    const preventivo = {
      id: Date.now().toString(),
      quoteNumber,
      timestamp: new Date().toISOString(),
      clientData: {
        firstName: firstName || '',
        lastName: lastName || '',
        clientName: fullName,
        email: to,
        phone: req.body.phone || '',
        companyName: companyName || '',
        vatNumber: vatNumber || '',
        address: address || ''
      },
      projectData: {
        businessType: businessType || '',
        businessCategories,
        location: location || '',
        squareMeters: squareMeters || '',
        projectDescription: projectDescription || ''
      },
      pricing: {
        totalPrice: totalPrice || 0,
        depositPercentage: depositPercentage || 0,
        depositTotal: depositTotal || 0,
        remainingTotal: remainingTotal || 0
      },
      status: 'inviato',
      sentAt: new Date().toISOString()
    };
    
    // Salva in Airtable
    await saveToAirtable({
      firstName: firstName || '',
      lastName: lastName || '',
      email: to,
      phone: req.body.phone || '',
      businessType: businessType || ''
    });

    const paymentLinkExpiresAt = new Date(Date.now() + PAYMENT_LINK_VALID_HOURS * 60 * 60 * 1000).toISOString();

    // Crea Payment Link Stripe; il link nell'email scade dopo 24 ore
    let stripeUrl = '';
    if (stripe) {
      try {
        const amountCents = Math.round((depositTotal || 0) * 100);
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3002';

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: 'eur',
                unit_amount: amountCents,
                product_data: {
                  name: 'Acconto Protocollo EMOTIVE®',
                  description: `${fullName} - ${businessType || ''} - ${location || ''}`,
                },
              },
            },
          ],
          after_completion: {
            type: 'redirect',
            redirect: {
              url: `${appBaseUrl}/?session_id={CHECKOUT_SESSION_ID}#success`,
            },
          },
          metadata: {
            firstName: firstName || '',
            lastName: lastName || '',
            clientName: fullName,
            businessType: businessType || '',
            location: location || '',
            totalPrice: String(totalPrice || ''),
          },
        });
        stripeUrl = paymentLink.url;
        console.log(`✅ Link pagamento creato (valido ${PAYMENT_LINK_VALID_HOURS} ore): ${stripeUrl}`);
      } catch (stripeErr) {
        console.warn('⚠️ Impossibile creare Payment Link Stripe:', stripeErr.message);
      }
    }

    try {
      const supabaseResult = await upsertSupabaseRecord({
        app_id: preventivo.id,
        event_type: 'email_sent',
        quote_number: quoteNumber,
        lead_number: '',
        status: 'inviato',
        first_name: firstName || '',
        last_name: lastName || '',
        client_name: fullName,
        email: to,
        phone: req.body.phone || '',
        business_type: businessType || '',
        business_categories: businessCategories,
        location: location || '',
        square_meters: squareMeters || '',
        company_name: companyName || '',
        vat_number: vatNumber || '',
        address: address || '',
        project_description: projectDescription || '',
        total_price: totalPrice || 0,
        deposit_percentage: depositPercentage || 0,
        deposit_total: depositTotal || 0,
        remaining_total: remainingTotal || 0,
        stripe_url: stripeUrl || '',
        payment_link_expires_at: paymentLinkExpiresAt,
        source: 'send-quote',
        lead_source: 'web_form',
        funnel_step: 'quote_sent',
        notes: '',
        metadata: { iban, hasPdfAttachment: true, businessCategories },
        timestamp_utc: preventivo.timestamp,
      });
      if (supabaseResult?.ok) {
        console.log(`✅ Sincronizzato con Supabase: ${preventivo.id}`);
      }
    } catch (supabaseErr) {
      console.warn('⚠️ Errore sincronizzazione Supabase (send-quote):', supabaseErr.message);
    }

    let conceptReportText = '';
    try {
      let conceptResult;
      if (AI_PROVIDER_MODE === 'huggingface_only') {
        conceptResult = await generateHuggingFaceConceptReport({
          clientName: fullName,
          businessType,
          location,
          squareMeters,
          projectDescription,
          variant: conceptVariant,
        });
      } else {
        try {
          conceptResult = await generateMiniMaxConceptReport({
            clientName: fullName,
            businessType,
            location,
            squareMeters,
            projectDescription,
            variant: conceptVariant,
          });
        } catch (minimaxErr) {
          console.warn('⚠️ MiniMax non disponibile, provo Gemini:', minimaxErr?.message || minimaxErr);
          try {
            conceptResult = await generateGeminiConceptReport({
              clientName: fullName,
              businessType,
              location,
              squareMeters,
              projectDescription,
              variant: conceptVariant,
            });
          } catch (geminiErr) {
            console.warn('⚠️ Gemini non disponibile, provo HuggingFace:', geminiErr?.message || geminiErr);
            conceptResult = await generateHuggingFaceConceptReport({
              clientName: fullName,
              businessType,
              location,
              squareMeters,
              projectDescription,
              variant: conceptVariant,
            });
          }
        }
      }
      conceptReportText = sanitizeConceptReport(conceptResult.text, fullName, businessType);
      console.log(`✅ Relazione concept generata (${conceptResult.source}, ${conceptVariant})`);
    } catch (aiErr) {
      console.warn('⚠️ AI non disponibile, uso fallback esteso:', aiErr?.message || aiErr);
      conceptReportText = sanitizeConceptReport(buildPersonalizedFallbackConceptReport({
        clientName: fullName,
        businessType,
        location,
        squareMeters,
        projectDescription,
        variant: conceptVariant,
      }), fullName, businessType);
      console.log(`ℹ️ Relazione concept fallback usata (${conceptVariant})`);
    }

    // Genera HTML email stile sito web moderno
    const htmlEmail = generateQuoteHTML({
      clientName: fullName,
      companyName,
      vatNumber,
      address,
      businessType,
      location,
      squareMeters,
      projectDescription,
      totalPrice,
      depositPercentage,
      depositTotal,
      remainingTotal,
      iban,
      stripeUrl,
      conceptReport: conceptReportText
    });

    // Genera PDF con encoding corretto
    console.log('Generazione PDF in corso...');
    const pdfBuffer = await generateQuotePDF({
      clientName: fullName,
      companyName,
      vatNumber,
      address,
      businessType,
      location,
      squareMeters,
      projectDescription,
      totalPrice,
      depositPercentage,
      depositTotal,
      remainingTotal,
      iban,
      stripeUrl,
      conceptReport: conceptReportText
    });
    console.log('PDF generato con successo');

    // Invia email HTML CON PDF allegato
    console.log(`Invio email HTML + PDF a: ${to}`);
    console.log(`Da: ${process.env.GMAIL_FROM}`);
    console.log(`Oggetto: ${subject}`);
    
    const data = await sendGmailHtml({
      env: process.env,
      to,
      subject,
      html: htmlEmail,
      attachments: [
        {
          filename: `Preventivo_EMOTIVE_${fullName?.replace(/\s+/g, '_') || 'Cliente'}.pdf`,
          content: pdfBuffer,
          mimeType: 'application/pdf'
        }
      ]
    });

    console.log(`✅ Email HTML + PDF inviata! ID: ${data.id}`);
    console.log(`📧 Controlla la casella di ${to}`);
    
    res.json({ ok: true, id: data.id, preventivoId: preventivo.id, quoteNumber, conceptVariant });
  } catch (err) {
    console.error('Errore invio email HTML + PDF:', err);
    res.status(500).send(err?.message || 'Errore invio Gmail.');
  }
});

// Endpoint per salvare i lead nel database
app.post('/api/leads/save', async (req, res) => {
  try {
    const { 
      firstName,
      lastName,
      clientName, 
      email, 
      phone, 
      businessType, 
      location, 
      squareMeters, 
      companyName, 
      vatNumber,
      address,
      totalPrice,
      depositPercentage,
      projectDescription
    } = req.body || {};
    
    // Validazione minima
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).send('Email non valida.');
    }
    
    // Calcola depositTotal
    const depositBase = (totalPrice || 0) * ((depositPercentage || 30) / 100);
    const depositVat = depositBase * 0.22;
    const depositTotal = depositBase + depositVat;
    
    const fullName = clientName || `${firstName || ''} ${lastName || ''}`.trim();
    const businessCategories = parseBusinessCategories(businessType);
    
    const leadNumber = nextSequenceCode('lead') || `LEAD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const newLead = {
      id: Date.now().toString(),
      leadNumber,
      timestamp: new Date().toISOString(),
      firstName: firstName || '',
      lastName: lastName || '',
      clientName: fullName,
      email,
      phone: phone || '',
      businessType: businessType || '',
      businessCategories,
      location: location || '',
      squareMeters: squareMeters || '',
      companyName: companyName || '',
      vatNumber: vatNumber || '',
      address: address || '',
      projectDescription: projectDescription || '',
      totalPrice: totalPrice || 0,
      depositPercentage: depositPercentage || 30,
      depositTotal: depositTotal,
      status: 'pending' // pending, contacted, converted, lost
    };
    
    // Salva in Airtable
    const airtableId = await saveToAirtable({
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      phone: phone || '',
      businessType: businessType || ''
    });

    try {
      const supabaseResult = await upsertSupabaseRecord({
        app_id: newLead.id,
        event_type: 'lead_saved',
        quote_number: '',
        lead_number: newLead.leadNumber || leadNumber,
        status: newLead.status,
        first_name: firstName || '',
        last_name: lastName || '',
        client_name: fullName,
        email,
        phone: phone || '',
        business_type: businessType || '',
        business_categories: businessCategories,
        location: location || '',
        square_meters: squareMeters || '',
        company_name: companyName || '',
        vat_number: vatNumber || '',
        address: address || '',
        project_description: projectDescription || '',
        total_price: totalPrice || 0,
        deposit_percentage: depositPercentage || 30,
        deposit_total: depositTotal || 0,
        remaining_total: 0,
        stripe_url: '',
        payment_link_expires_at: null,
        source: 'lead-save',
        lead_source: 'web_form',
        funnel_step: 'lead_created',
        notes: '',
        metadata: { airtableId: airtableId || null, businessCategories },
        timestamp_utc: newLead.timestamp,
      });
      if (supabaseResult?.ok) {
        console.log(`✅ Lead sincronizzato con Supabase: ${newLead.id}`);
      }
    } catch (supabaseErr) {
      console.warn('⚠️ Errore sincronizzazione Supabase (lead-save):', supabaseErr.message);
    }
    
    console.log(`✅ Lead salvato: ${fullName} (${email})`);
    if (airtableId) {
      console.log(`✅ Sincronizzato con Airtable ID: ${airtableId}`);
    }
    
    res.json({ ok: true, leadId: newLead.id, leadNumber: newLead.leadNumber || leadNumber, airtableId });
  } catch (err) {
    console.error('Errore salvataggio lead:', err);
    res.status(500).send('Errore salvataggio lead.');
  }
});

if (process.env.START_SERVER !== 'false') {
  app.listen(port, () => {
    console.log(`Stripe server listening on http://localhost:${port}`);
  });
}

module.exports = app;

