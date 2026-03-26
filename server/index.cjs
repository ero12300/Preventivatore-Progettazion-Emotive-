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
/** Acconto cliente: fisso protocollo (allineato al preventivatore). */
const FIXED_CLIENT_DEPOSIT_PERCENT = 30;

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
const PRICING_RULES_TABLE = (process.env.PRICING_RULES_TABLE || 'pricing_rules_emotive').trim();
const DISCOUNT_CODES_TABLE = (process.env.DISCOUNT_CODES_TABLE || 'pricing_discount_codes').trim();
const REFERRAL_RULES_TABLE = (process.env.REFERRAL_RULES_TABLE || 'pricing_referral_rules').trim();
const PARTNERS_TABLE = (process.env.PARTNERS_TABLE || 'partners').trim();
const PARTNER_REFERRALS_TABLE = (process.env.PARTNER_REFERRALS_TABLE || 'partner_referrals').trim();
const PARTNER_COMMISSIONS_TABLE = (process.env.PARTNER_COMMISSIONS_TABLE || 'partner_commissions').trim();
const CRM_CLIENTS_TABLE = (process.env.CRM_CLIENTS_TABLE || 'clients').trim();
const CRM_PRACTICES_TABLE = (process.env.CRM_PRACTICES_TABLE || 'practices').trim();
const CRM_PROJECT_DESIGNERS_TABLE = (process.env.CRM_PROJECT_DESIGNERS_TABLE || 'project_designers').trim();
const CRM_DEFAULT_DESIGNER_EMAIL = String(process.env.CRM_DEFAULT_DESIGNER_EMAIL || 'boncordoarredi89@gmail.com')
  .trim()
  .toLowerCase();
const ADMIN_PRICING_SECRET = (process.env.ADMIN_PRICING_SECRET || '').trim();
const LEAD_NOTIFICATION_EMAIL = String(process.env.LEAD_NOTIFICATION_EMAIL || 'amm.emotivegroup@gmail.com')
  .trim()
  .replace(/\r?\n/g, '');

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

  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const businessType = String(data.businessType || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  const fieldSets = [
    // Schema storico Emotive (IT)
    {
      Name: firstName,
      Cognome: lastName,
      Telefono: phone,
      Email: email,
      Richiesta: businessType,
    },
    // Schema classico EN
    {
      Name: fullName || firstName,
      Email: email,
      Phone: phone,
      Request: businessType,
    },
    // Schema lead gen comune
    {
      Nome: firstName,
      'Cognome Cliente': lastName,
      'Email Cliente': email,
      'Telefono Cliente': phone,
      'Tipo Locale': businessType,
    },
    // Schema minimale (solo campi tipicamente sempre presenti)
    {
      Name: fullName || firstName || email,
      Email: email,
    },
  ];

  try {
    let lastError = null;
    for (const fields of fieldSets) {
      // Rimuove campi vuoti per evitare validazioni inutili lato Airtable
      const cleaned = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => String(value || '').trim() !== '')
      );
      if (Object.keys(cleaned).length === 0) continue;
      try {
        const record = await airtableBase(AIRTABLE_TABLE_NAME).create([{ fields: cleaned }]);
        const recId = record?.[0]?.id || null;
        if (recId) {
          console.log(`✅ Cliente salvato in Airtable: ${fullName || email} (ID: ${recId})`);
          return recId;
        }
      } catch (attemptErr) {
        lastError = attemptErr;
      }
    }
    throw lastError || new Error('Nessun mapping campi Airtable compatibile.');
  } catch (err) {
    console.error('❌ Errore salvataggio Airtable:', err?.message || err);
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

async function supabaseSelect(table, queryString) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase select ${table} fallito (${response.status}): ${text.slice(0, 280)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function supabaseUpsert(table, payload, onConflict) {
  const conflict = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const url = `${SUPABASE_URL}/rest/v1/${table}${conflict}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase upsert ${table} fallito (${response.status}): ${text.slice(0, 280)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function supabaseInsert(table, payload) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase insert ${table} fallito (${response.status}): ${text.slice(0, 280)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function isAdminAuthorized(req) {
  const provided = String(req.headers['x-admin-pricing-secret'] || '');
  return Boolean(ADMIN_PRICING_SECRET && provided && provided === ADMIN_PRICING_SECRET);
}

function isValidEmail(email) {
  const value = String(email || '').trim();
  return Boolean(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePayoutMethod(method) {
  const value = String(method || '').trim().toLowerCase();
  if (value === 'bank_transfer' || value === 'stripe_connect' || value === 'manual_card') {
    return value;
  }
  return '';
}

function parseSquareMeters(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function calculateVat(priceExVat) {
  const vat = priceExVat * 0.22;
  return {
    vatAmount: Number(vat.toFixed(2)),
    priceIncVat: Number((priceExVat + vat).toFixed(2)),
  };
}

function asBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

async function getPricingRuleForMq(squareMeters) {
  const rows = await supabaseSelect(
    PRICING_RULES_TABLE,
    `select=id,name,min_mq,max_mq,base_price_ex_vat,priority,is_active,valid_from,valid_to&is_active=eq.true&min_mq=lte.${squareMeters}&max_mq=gte.${squareMeters}&order=priority.asc,min_mq.asc&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getDiscountByCode(code) {
  if (!code) return null;
  const rows = await supabaseSelect(
    DISCOUNT_CODES_TABLE,
    `select=code,type,value,is_active,valid_from,valid_to,max_uses,used_count&code=eq.${encodeURIComponent(code)}&is_active=eq.true&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getReferralByCode(code) {
  if (!code) return null;
  const rows = await supabaseSelect(
    REFERRAL_RULES_TABLE,
    `select=referral_code,reward_type,reward_value,is_active,valid_from,valid_to&referral_code=eq.${encodeURIComponent(code)}&is_active=eq.true&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

function computeDiscountAmount(basePrice, type, value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  if (type === 'fixed') {
    return Math.max(0, Math.min(basePrice, numericValue));
  }
  if (type === 'percentage') {
    return Math.max(0, Math.min(basePrice, (basePrice * numericValue) / 100));
  }
  return 0;
}

function isRuleDateValid(rule) {
  const now = new Date();
  if (rule?.valid_from && new Date(rule.valid_from) > now) return false;
  if (rule?.valid_to && new Date(rule.valid_to) < now) return false;
  return true;
}

async function calculateDynamicPricing({ squareMeters, discountCode, referralCode, manualOverridePrice, isAdminOverride }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configurato per pricing dinamico.');
  }

  const parsedMq = parseSquareMeters(squareMeters);
  if (!parsedMq) {
    throw new Error('Metri quadri non validi.');
  }

  const pricingRule = await getPricingRuleForMq(parsedMq);
  if (!pricingRule) {
    throw new Error(`Nessuna fascia prezzo attiva trovata per ${parsedMq} mq.`);
  }
  if (!isRuleDateValid(pricingRule)) {
    throw new Error('La fascia prezzo trovata non e valida in questo momento.');
  }

  const basePrice = Number(pricingRule.base_price_ex_vat || 0);
  let totalDiscount = 0;
  let appliedDiscountCode = null;
  let appliedReferralCode = null;

  if (discountCode) {
    const discountRule = await getDiscountByCode(String(discountCode).trim());
    if (discountRule && isRuleDateValid(discountRule)) {
      const usageLimit = Number(discountRule.max_uses || 0);
      const usedCount = Number(discountRule.used_count || 0);
      const canUse = !usageLimit || usedCount < usageLimit;
      if (canUse) {
        totalDiscount += computeDiscountAmount(basePrice, discountRule.type, discountRule.value);
        appliedDiscountCode = String(discountRule.code || '').trim() || null;
      }
    }
  }

  if (referralCode) {
    const referralRule = await getReferralByCode(String(referralCode).trim());
    if (referralRule && isRuleDateValid(referralRule)) {
      if (referralRule.reward_type === 'customer_discount') {
        totalDiscount += computeDiscountAmount(basePrice, 'percentage', referralRule.reward_value);
      } else if (referralRule.reward_type === 'customer_discount_fixed') {
        totalDiscount += computeDiscountAmount(basePrice, 'fixed', referralRule.reward_value);
      }
      appliedReferralCode = String(referralRule.referral_code || '').trim() || null;
    }
  }

  let finalPriceExVat = Math.max(0, Number((basePrice - totalDiscount).toFixed(2)));
  let manualOverrideApplied = false;

  if (isAdminOverride && Number.isFinite(Number(manualOverridePrice))) {
    finalPriceExVat = Math.max(0, Number(Number(manualOverridePrice).toFixed(2)));
    manualOverrideApplied = true;
  }

  const { vatAmount, priceIncVat } = calculateVat(finalPriceExVat);

  return {
    squareMeters: parsedMq,
    pricingRuleId: pricingRule.id || null,
    pricingRuleName: pricingRule.name || `${pricingRule.min_mq}-${pricingRule.max_mq} mq`,
    basePriceExVat: Number(basePrice.toFixed(2)),
    totalDiscountExVat: Number(totalDiscount.toFixed(2)),
    finalPriceExVat,
    vatAmount,
    finalPriceIncVat: priceIncVat,
    appliedDiscountCode,
    appliedReferralCode,
    manualOverrideApplied,
  };
}

async function getPartnerByCode(referralCode) {
  if (!referralCode) return null;
  const normalized = String(referralCode).trim().toUpperCase();
  if (!normalized) return null;
  const rows = await supabaseSelect(
    PARTNERS_TABLE,
    `select=id,code,display_name,email,commission_percent,is_active&code=eq.${encodeURIComponent(normalized)}&is_active=eq.true&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createPartnerReferralAndCommission({
  referralCode,
  leadEmail,
  quoteNumber,
  preventivoAppId,
  totalPriceExVat,
  metadata,
}) {
  if (!isSupabaseConfigured()) return { ok: false, skipped: true, reason: 'Supabase non configurato' };
  if (!referralCode) return { ok: false, skipped: true, reason: 'Nessun referralCode' };

  const partner = await getPartnerByCode(referralCode);
  if (!partner?.id) return { ok: false, skipped: true, reason: 'Partner non trovato o disattivo' };
  const partnerEmail = String(partner.email || '').trim();
  if (!partnerEmail || !partnerEmail.includes('@')) {
    throw new Error(`Partner ${partner.code || referralCode} senza email valida: impostare email in tabella partners.`);
  }

  let referral = null;
  let referralCreated = false;
  if (preventivoAppId) {
    const existingReferrals = await supabaseSelect(
      PARTNER_REFERRALS_TABLE,
      `select=id,partner_id,referral_code,preventivo_app_id,status&preventivo_app_id=eq.${encodeURIComponent(preventivoAppId)}&limit=1`
    );
    referral = Array.isArray(existingReferrals) ? existingReferrals[0] || null : null;
  }
  if (!referral) {
    const referralRows = await supabaseInsert(PARTNER_REFERRALS_TABLE, {
      partner_id: partner.id,
      referral_code: String(referralCode).trim().toUpperCase(),
      lead_email: leadEmail || null,
      quote_number: quoteNumber || null,
      preventivo_app_id: preventivoAppId || null,
      status: 'paid',
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    });
    referral = Array.isArray(referralRows) ? referralRows[0] || null : null;
    referralCreated = true;
  }

  const commissionPercent = Number(partner.commission_percent || 0);
  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
    return { ok: true, referralId: referral?.id || null, commissionSkipped: true };
  }
  const amountEur = Number(((Number(totalPriceExVat || 0) * commissionPercent) / 100).toFixed(2));
  if (amountEur <= 0) {
    return { ok: true, referralId: referral?.id || null, commissionSkipped: true };
  }

  let commission = null;
  let commissionCreated = false;
  if (referral?.id) {
    const existingCommissions = await supabaseSelect(
      PARTNER_COMMISSIONS_TABLE,
      `select=id,referral_id,amount_eur,status&referral_id=eq.${encodeURIComponent(referral.id)}&limit=1`
    );
    commission = Array.isArray(existingCommissions) ? existingCommissions[0] || null : null;
  }
  if (!commission) {
    const commissionRows = await supabaseInsert(PARTNER_COMMISSIONS_TABLE, {
      partner_id: partner.id,
      referral_id: referral?.id || null,
      amount_eur: amountEur,
      currency: 'EUR',
      status: 'pending',
      notes: `Commissione automatica ${commissionPercent}% su preventivo ${quoteNumber || ''}`.trim(),
      updated_at: new Date().toISOString(),
    });
    commission = Array.isArray(commissionRows) ? commissionRows[0] || null : null;
    commissionCreated = true;
  }

  return {
    ok: true,
    partnerId: partner.id,
    partnerCode: partner.code || null,
    partnerName: partner.display_name || null,
    partnerEmail,
    referralId: referral?.id || null,
    referralCreated,
    commissionId: commission?.id || null,
    commissionAmountEur: amountEur,
    commissionCreated,
  };
}

function parseBusinessCategories(businessType) {
  if (typeof businessType !== 'string') return [];
  return businessType
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function findCrmDesignerIdByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const rows = await supabaseSelect(
    CRM_PROJECT_DESIGNERS_TABLE,
    `select=id,email,is_active&email=eq.${encodeURIComponent(normalized)}&is_active=eq.true&limit=1`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.id || null;
}

async function ensureCrmClientAndPracticeFromLead({
  leadNumber,
  fullName,
  email,
  phone,
  companyName,
  vatNumber,
  location,
  businessType,
  squareMeters,
  totalPrice,
  depositTotal,
}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, skipped: true, reason: 'supabase_not_configured' };
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { ok: false, skipped: true, reason: 'invalid_email' };
  }

  const clientPayload = {
    full_name: String(fullName || '').trim() || normalizedEmail,
    email: normalizedEmail,
    phone: String(phone || '').trim() || null,
    company_name: String(companyName || '').trim() || null,
    vat_number: String(vatNumber || '').trim() || null,
    city: String(location || '').trim() || null,
    business_type: String(businessType || '').trim() || null,
  };

  const clientRows = await supabaseUpsert(CRM_CLIENTS_TABLE, clientPayload, 'email');
  const clientId = Array.isArray(clientRows) ? clientRows[0]?.id : null;
  if (!clientId) {
    throw new Error('Impossibile ottenere client_id CRM dopo upsert.');
  }

  let assignedDesignerId = await findCrmDesignerIdByEmail(normalizedEmail);
  if (!assignedDesignerId && CRM_DEFAULT_DESIGNER_EMAIL) {
    assignedDesignerId = await findCrmDesignerIdByEmail(CRM_DEFAULT_DESIGNER_EMAIL);
  }

  const safeLeadNumber = String(leadNumber || '').trim() || `LEAD-${Date.now().toString().slice(-8)}`;
  const numericTotal = Number(totalPrice || 0);
  const numericDeposit = Number(depositTotal || 0);
  const numericBalance = Math.max(0, numericTotal - numericDeposit);
  const sq = Number(squareMeters || 0);
  const nextFollowupAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const practicePayload = {
    reference_code: safeLeadNumber,
    client_id: clientId,
    status: 'preventivo_inviato',
    scheduler_provider: process.env.CRM_SCHEDULER_PROVIDER === 'calcom' ? 'calcom' : 'calendly',
    quote_amount: numericTotal,
    deposit_amount: numericDeposit,
    balance_amount: numericBalance,
    square_meters: Number.isFinite(sq) && sq > 0 ? Math.round(sq) : null,
    assigned_designer_id: assignedDesignerId || null,
    next_followup_at: nextFollowupAt,
    metadata: {
      source: 'preventivatore_lead_save',
      auto_bridge: true,
      bridge_created_at: new Date().toISOString(),
    },
  };

  const practiceRows = await supabaseUpsert(CRM_PRACTICES_TABLE, practicePayload, 'reference_code');
  const practiceId = Array.isArray(practiceRows) ? practiceRows[0]?.id : null;
  if (!practiceId) {
    throw new Error('Impossibile ottenere practice_id CRM dopo upsert.');
  }

  return {
    ok: true,
    clientId,
    practiceId,
    referenceCode: safeLeadNumber,
    assignedDesignerId: assignedDesignerId || null,
  };
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
    pricing_rule_id: record.pricing_rule_id || null,
    pricing_rule_name: record.pricing_rule_name || null,
    applied_discount_code: record.applied_discount_code || null,
    applied_referral_code: record.applied_referral_code || null,
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

app.post('/api/pricing/calculate', async (req, res) => {
  try {
    const { squareMeters, discountCode, referralCode, manualOverridePrice } = req.body || {};
    const adminOverrideHeader = String(req.headers['x-admin-pricing-secret'] || '');
    const isAdminOverride = Boolean(
      ADMIN_PRICING_SECRET &&
      adminOverrideHeader &&
      adminOverrideHeader === ADMIN_PRICING_SECRET &&
      Number.isFinite(Number(manualOverridePrice))
    );
    const result = await calculateDynamicPricing({
      squareMeters,
      discountCode,
      referralCode,
      manualOverridePrice,
      isAdminOverride,
    });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      message: err?.message || 'Errore calcolo pricing dinamico.',
    });
  }
});

app.get('/api/pricing/rules', async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({ ok: false, message: 'Supabase non configurato.' });
    }
    const rows = await supabaseSelect(
      PRICING_RULES_TABLE,
      'select=id,name,min_mq,max_mq,base_price_ex_vat,priority,is_active,valid_from,valid_to&is_active=eq.true&order=min_mq.asc'
    );
    return res.json({ ok: true, rules: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore lettura fasce prezzo.' });
  }
});

app.get('/api/admin/pricing/rules', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const rows = await supabaseSelect(
      PRICING_RULES_TABLE,
      'select=id,name,min_mq,max_mq,base_price_ex_vat,priority,is_active,valid_from,valid_to,updated_at&order=min_mq.asc'
    );
    return res.json({ ok: true, rules: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore caricamento regole pricing.' });
  }
});

app.post('/api/admin/pricing/rules/upsert', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const body = req.body || {};
    const minMq = Number(body.min_mq);
    const maxMq = Number(body.max_mq);
    const basePrice = Number(body.base_price_ex_vat);
    const priority = Number(body.priority || 100);
    if (!Number.isFinite(minMq) || !Number.isFinite(maxMq) || !Number.isFinite(basePrice) || minMq < 0 || maxMq < minMq || basePrice < 0) {
      return res.status(400).json({ ok: false, message: 'Valori fascia non validi.' });
    }
    const payload = {
      id: body.id || undefined,
      name: String(body.name || `Fascia ${minMq}-${maxMq} mq`).trim(),
      min_mq: Math.round(minMq),
      max_mq: Math.round(maxMq),
      base_price_ex_vat: Number(basePrice.toFixed(2)),
      priority: Number.isFinite(priority) ? Math.round(priority) : 100,
      is_active: body.is_active !== undefined ? asBoolean(body.is_active) : true,
      valid_from: body.valid_from || null,
      valid_to: body.valid_to || null,
      updated_at: new Date().toISOString(),
    };
    const rows = await supabaseUpsert(PRICING_RULES_TABLE, payload, 'id');
    return res.json({ ok: true, rule: Array.isArray(rows) ? rows[0] || payload : payload });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore salvataggio fascia.' });
  }
});

app.post('/api/admin/discount-codes/upsert', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const body = req.body || {};
    const code = String(body.code || '').trim().toUpperCase();
    const type = String(body.type || 'percentage').trim();
    const value = Number(body.value);
    if (!code || !['percentage', 'fixed'].includes(type) || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ ok: false, message: 'Codice sconto non valido.' });
    }
    const payload = {
      code,
      type,
      value: Number(value.toFixed(2)),
      max_uses: body.max_uses !== undefined && body.max_uses !== '' ? Math.max(0, Math.round(Number(body.max_uses))) : null,
      used_count: 0,
      is_active: body.is_active !== undefined ? asBoolean(body.is_active) : true,
      visible_to_client: body.visible_to_client !== undefined ? asBoolean(body.visible_to_client) : true,
      valid_from: body.valid_from || null,
      valid_to: body.valid_to || null,
      notes_internal: body.notes_internal || null,
      updated_at: new Date().toISOString(),
    };
    const rows = await supabaseUpsert(DISCOUNT_CODES_TABLE, payload, 'code');
    return res.json({ ok: true, discount: Array.isArray(rows) ? rows[0] || payload : payload });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore salvataggio codice sconto.' });
  }
});

app.post('/api/admin/referral-rules/upsert', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const body = req.body || {};
    const referralCode = String(body.referral_code || '').trim().toUpperCase();
    const rewardType = String(body.reward_type || 'customer_discount').trim();
    const rewardValue = Number(body.reward_value);
    const allowedRewardTypes = ['customer_discount', 'customer_discount_fixed', 'cash_commission', 'credit'];
    if (!referralCode || !allowedRewardTypes.includes(rewardType) || !Number.isFinite(rewardValue) || rewardValue < 0) {
      return res.status(400).json({ ok: false, message: 'Regola referral non valida.' });
    }
    const isActive = body.is_active !== undefined ? asBoolean(body.is_active) : true;
    if (isActive) {
      const partner = await getPartnerByCode(referralCode);
      if (!partner?.id) {
        return res.status(400).json({
          ok: false,
          message: `Per attivare il referral ${referralCode} devi prima creare un partner attivo con lo stesso codice.`,
        });
      }
      if (!isValidEmail(partner.email)) {
        return res.status(400).json({
          ok: false,
          message: `Per attivare il referral ${referralCode} il partner deve avere una email valida.`,
        });
      }
    }
    const payload = {
      referral_code: referralCode,
      reward_type: rewardType,
      reward_value: Number(rewardValue.toFixed(2)),
      is_active: isActive,
      valid_from: body.valid_from || null,
      valid_to: body.valid_to || null,
      notes_internal: body.notes_internal || null,
      updated_at: new Date().toISOString(),
    };
    const rows = await supabaseUpsert(REFERRAL_RULES_TABLE, payload, 'referral_code');
    return res.json({ ok: true, referral: Array.isArray(rows) ? rows[0] || payload : payload });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore salvataggio referral.' });
  }
});

app.get('/api/admin/partners', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const rows = await supabaseSelect(
      PARTNERS_TABLE,
      'select=id,code,display_name,email,commission_percent,is_active,updated_at&order=updated_at.desc'
    );
    return res.json({ ok: true, partners: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore caricamento partner.' });
  }
});

app.post('/api/admin/partners/upsert', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const body = req.body || {};
    const code = String(body.code || '').trim().toUpperCase();
    const displayName = String(body.display_name || '').trim();
    const email = String(body.email || '').trim();
    const commissionPercent = Number(body.commission_percent || 0);
    const isActive = body.is_active !== undefined ? asBoolean(body.is_active) : true;
    if (!code || !displayName || !Number.isFinite(commissionPercent) || commissionPercent < 0) {
      return res.status(400).json({ ok: false, message: 'Dati partner non validi.' });
    }
    if (isActive && !isValidEmail(email)) {
      return res.status(400).json({ ok: false, message: 'Email partner obbligatoria e valida quando il partner è attivo.' });
    }

    const payoutMethod = normalizePayoutMethod(body.payout_method);
    const payoutEmail = String(body.payout_email || '').trim();
    const bankAccountHolder = String(body.bank_account_holder || '').trim();
    const bankIban = String(body.bank_iban || '').trim().toUpperCase();
    const stripeAccountId = String(body.stripe_account_id || '').trim();
    if (payoutMethod === 'bank_transfer') {
      if (!bankAccountHolder || !bankIban) {
        return res.status(400).json({ ok: false, message: 'Per bonifico servono intestatario e IBAN partner.' });
      }
    }
    if (payoutMethod === 'stripe_connect') {
      if (!isValidEmail(payoutEmail || email)) {
        return res.status(400).json({ ok: false, message: 'Per payout Stripe Connect serve una email valida.' });
      }
    }

    const payload = {
      id: body.id || undefined,
      code,
      display_name: displayName,
      email: email || null,
      commission_percent: Number(commissionPercent.toFixed(2)),
      is_active: isActive,
      payout_method: payoutMethod || null,
      payout_email: payoutEmail || null,
      bank_account_holder: bankAccountHolder || null,
      bank_iban: bankIban || null,
      stripe_account_id: stripeAccountId || null,
      updated_at: new Date().toISOString(),
    };
    const rows = await supabaseUpsert(PARTNERS_TABLE, payload, 'id');
    return res.json({ ok: true, partner: Array.isArray(rows) ? rows[0] || payload : payload });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore salvataggio partner.' });
  }
});

async function getPartnerById(partnerId) {
  if (!partnerId) return null;
  const rows = await supabaseSelect(
    PARTNERS_TABLE,
    `select=id,code,display_name,email,commission_percent,is_active,payout_method,payout_email,bank_account_holder,bank_iban,stripe_account_id&id=eq.${encodeURIComponent(partnerId)}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getCommissionById(commissionId) {
  if (!commissionId) return null;
  const rows = await supabaseSelect(
    PARTNER_COMMISSIONS_TABLE,
    `select=id,partner_id,referral_id,amount_eur,status,currency,created_at&id=eq.${encodeURIComponent(commissionId)}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function supabaseUpdateById(table, id, payload) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase update ${table} fallito (${response.status}): ${text.slice(0, 280)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

app.post('/api/admin/partners/stripe-connect/onboarding-link', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    if (!stripe) {
      return res.status(500).json({ ok: false, message: 'Stripe non configurato.' });
    }
    const partnerId = String(req.body?.partner_id || '').trim();
    const partnerCode = String(req.body?.partner_code || '').trim().toUpperCase();
    let partner = null;
    if (partnerId) {
      partner = await getPartnerById(partnerId);
    } else if (partnerCode) {
      partner = await getPartnerByCode(partnerCode);
    }
    if (!partner?.id) {
      return res.status(404).json({ ok: false, message: 'Partner non trovato.' });
    }
    const partnerEmail = String(partner.payout_email || partner.email || '').trim();
    if (!isValidEmail(partnerEmail)) {
      return res.status(400).json({ ok: false, message: 'Partner senza email valida per Stripe onboarding.' });
    }

    let stripeAccountId = String(partner.stripe_account_id || '').trim();
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: partnerEmail,
        capabilities: { transfers: { requested: true } },
        metadata: {
          partnerId: partner.id,
          partnerCode: partner.code || '',
        },
      });
      stripeAccountId = account.id;
      await supabaseUpdateById(PARTNERS_TABLE, partner.id, {
        stripe_account_id: stripeAccountId,
        payout_method: 'stripe_connect',
        payout_email: partnerEmail,
        updated_at: new Date().toISOString(),
      });
    }

    const baseUrl = process.env.APP_BASE_URL || 'https://emotive-preventivatore-progettazion.vercel.app';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/#admin-pricing`,
      return_url: `${baseUrl}/#admin-pricing`,
      type: 'account_onboarding',
    });

    return res.json({ ok: true, partnerId: partner.id, stripeAccountId, onboardingUrl: accountLink.url });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore creazione onboarding Stripe Connect.' });
  }
});

app.post('/api/admin/partner-commissions/pay', async (req, res) => {
  try {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ ok: false, message: 'Non autorizzato.' });
    }
    const commissionId = String(req.body?.commission_id || '').trim();
    const requestedMethod = normalizePayoutMethod(req.body?.payout_method);
    const payoutReference = String(req.body?.payout_reference || '').trim();
    const notes = String(req.body?.notes || '').trim();
    if (!commissionId || !requestedMethod) {
      return res.status(400).json({ ok: false, message: 'commission_id e payout_method sono obbligatori.' });
    }
    const commission = await getCommissionById(commissionId);
    if (!commission?.id) {
      return res.status(404).json({ ok: false, message: 'Commissione non trovata.' });
    }
    if (String(commission.status || '').toLowerCase() === 'paid') {
      return res.json({ ok: true, message: 'Commissione già pagata.', commissionId });
    }
    const partner = await getPartnerById(commission.partner_id);
    if (!partner?.id) {
      return res.status(404).json({ ok: false, message: 'Partner collegato non trovato.' });
    }

    let finalReference = payoutReference;
    if (requestedMethod === 'stripe_connect') {
      if (!stripe) {
        return res.status(500).json({ ok: false, message: 'Stripe non configurato per payout.' });
      }
      const destinationAccount = String(partner.stripe_account_id || '').trim();
      if (!destinationAccount) {
        return res.status(400).json({ ok: false, message: 'Partner senza account Stripe Connect.' });
      }
      const amountCents = Math.round(Number(commission.amount_eur || 0) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return res.status(400).json({ ok: false, message: 'Importo commissione non valido.' });
      }
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'eur',
        destination: destinationAccount,
        metadata: {
          commissionId: commission.id,
          partnerId: partner.id,
          partnerCode: partner.code || '',
        },
      });
      finalReference = transfer.id;
    } else if (requestedMethod === 'bank_transfer' && !finalReference) {
      return res.status(400).json({ ok: false, message: 'Per bonifico inserisci riferimento pagamento (CRO/TRN).' });
    } else if (requestedMethod === 'manual_card' && !finalReference) {
      return res.status(400).json({ ok: false, message: 'Per pagamento carta manuale inserisci riferimento transazione.' });
    }

    const updatedRows = await supabaseUpdateById(PARTNER_COMMISSIONS_TABLE, commission.id, {
      status: 'paid',
      payout_method: requestedMethod,
      payout_reference: finalReference || null,
      notes: notes || null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const updated = Array.isArray(updatedRows) ? updatedRows[0] || null : null;

    if (isValidEmail(partner.email)) {
      try {
        await sendGmailText({
          env: process.env,
          to: partner.email,
          subject: `Pagamento commissione completato - ${partner.code || 'PARTNER'}`,
          text:
            `Ciao ${partner.display_name || 'Partner'},\n\n` +
            `il pagamento della tua commissione è stato completato.\n` +
            `Importo: EUR ${Number(commission.amount_eur || 0).toFixed(2)}\n` +
            `Metodo: ${requestedMethod}\n` +
            `Riferimento: ${finalReference || 'n/d'}\n` +
            `Stato: paid\n\n` +
            `EMOTIVE`,
        });
      } catch (mailErr) {
        console.warn('⚠️ Email conferma payout partner non inviata:', mailErr?.message || mailErr);
      }
    }

    return res.json({ ok: true, commission: updated || { id: commission.id, status: 'paid' } });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Errore pagamento commissione partner.' });
  }
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

    const { email, clientName, businessType, location, totalPrice } = req.body || {};

    const totalExVat = Number(totalPrice || 0);
    const serverDepositIncVat = Number(
      (totalExVat * (FIXED_CLIENT_DEPOSIT_PERCENT / 100) * 1.22).toFixed(2)
    );
    const amountCents = Math.round(serverDepositIncVat * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0 || !Number.isFinite(totalExVat) || totalExVat <= 0) {
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
              description: `Attivazione (${FIXED_CLIENT_DEPOSIT_PERCENT}% + IVA) - ${clientName || 'Cliente'}`,
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
        depositPercentage: String(FIXED_CLIENT_DEPOSIT_PERCENT),
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
      remainingTotal,
      discountCode,
      referralCode
    } = req.body || {};
    
    if (typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).send('Campo "to" non valido.');
    }

    const iban = 'IT69J3609201600991466031460';
    
    const fullName = clientName || `${firstName || ''} ${lastName || ''}`.trim();
    const dynamicPricing = await calculateDynamicPricing({
      squareMeters,
      discountCode,
      referralCode,
      manualOverridePrice: null,
      isAdminOverride: false,
    });
    const effectiveTotalPrice = Number(dynamicPricing.finalPriceExVat || totalPrice || 0);
    const effectiveDepositPercentage = FIXED_CLIENT_DEPOSIT_PERCENT;
    const effectiveDepositTotal = Number(
      (effectiveTotalPrice * (effectiveDepositPercentage / 100) * 1.22).toFixed(2)
    );
    const effectiveRemainingTotal = Number(
      (effectiveTotalPrice * (1 - effectiveDepositPercentage / 100) * 1.22).toFixed(2)
    );
    const referralCodeForTracking =
      dynamicPricing.appliedReferralCode ||
      (typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '');
    const businessCategories = parseBusinessCategories(businessType);
    let crmBridgeResult = null;
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
        totalPrice: effectiveTotalPrice,
        depositPercentage: effectiveDepositPercentage,
        depositTotal: effectiveDepositTotal,
        remainingTotal: effectiveRemainingTotal
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

    if (!stripe) {
      return res.status(500).send('Stripe non configurato. Impossibile inviare il preventivo senza link pagamento.');
    }

    // Crea Payment Link Stripe; il link nell'email scade dopo 24 ore
    let stripeUrl = '';
    try {
      const amountCents = Math.round((effectiveDepositTotal || 0) * 100);
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
          totalPrice: String(effectiveTotalPrice || ''),
        },
      });
      stripeUrl = paymentLink.url;
      console.log(`✅ Link pagamento creato (valido ${PAYMENT_LINK_VALID_HOURS} ore): ${stripeUrl}`);
    } catch (stripeErr) {
      console.warn('⚠️ Impossibile creare Payment Link Stripe:', stripeErr.message);
      return res.status(500).send('Errore creazione link pagamento Stripe. Preventivo non inviato.');
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
        total_price: effectiveTotalPrice || 0,
        deposit_percentage: effectiveDepositPercentage || 0,
        deposit_total: effectiveDepositTotal || 0,
        remaining_total: effectiveRemainingTotal || 0,
        pricing_rule_id: dynamicPricing.pricingRuleId || null,
        pricing_rule_name: dynamicPricing.pricingRuleName || null,
        applied_discount_code: dynamicPricing.appliedDiscountCode || null,
        applied_referral_code: referralCodeForTracking || null,
        stripe_url: stripeUrl || '',
        payment_link_expires_at: paymentLinkExpiresAt,
        source: 'send-quote',
        lead_source: 'web_form',
        funnel_step: 'quote_sent',
        notes: '',
        metadata: {
          iban,
          hasPdfAttachment: true,
          businessCategories,
          pricingRuleId: dynamicPricing.pricingRuleId,
          pricingRuleName: dynamicPricing.pricingRuleName,
          appliedDiscountCode: dynamicPricing.appliedDiscountCode,
          appliedReferralCode: referralCodeForTracking || null,
        },
        timestamp_utc: preventivo.timestamp,
      });
      if (supabaseResult?.ok) {
        console.log(`✅ Sincronizzato con Supabase: ${preventivo.id}`);
      }
      if (referralCodeForTracking) {
        const referralResult = await createPartnerReferralAndCommission({
          referralCode: referralCodeForTracking,
          leadEmail: to,
          quoteNumber,
          preventivoAppId: preventivo.id,
          totalPriceExVat: effectiveTotalPrice,
          metadata: {
            businessType: businessType || '',
            location: location || '',
            squareMeters: squareMeters || '',
          },
        });
        if (referralResult?.ok) {
          console.log(`✅ Referral/commissione registrati (${referralCodeForTracking})`);
          if (
            referralResult.partnerEmail &&
            referralResult.commissionId &&
            referralResult.commissionCreated
          ) {
            try {
              await sendGmailText({
                env: process.env,
                to: referralResult.partnerEmail,
                subject: `Nuova commissione registrata - ${referralResult.partnerCode || 'PARTNER'}`,
                text:
                  `Ciao ${referralResult.partnerName || 'Partner'},\n\n` +
                  `il tuo codice referral ${referralResult.partnerCode || referralCodeForTracking} è stato utilizzato con successo.\n` +
                  `Cliente: ${fullName}\n` +
                  `Preventivo: ${quoteNumber}\n` +
                  `Importo commissione: EUR ${Number(referralResult.commissionAmountEur || 0).toFixed(2)}\n` +
                  `Stato: pending\n\n` +
                  `Trovi lo storico completo nella dashboard partner.\n\n` +
                  `EMOTIVE`,
              });
              console.log(`✅ Notifica email partner inviata a ${referralResult.partnerEmail}`);
            } catch (notifyErr) {
              console.warn('⚠️ Notifica partner non inviata:', notifyErr?.message || notifyErr);
            }
          }
          if (isValidEmail(LEAD_NOTIFICATION_EMAIL)) {
            try {
              await sendGmailText({
                env: process.env,
                to: LEAD_NOTIFICATION_EMAIL,
                subject: `Referral attivo - Partner ${referralResult.partnerCode || referralCodeForTracking}`,
                text:
                  `Un partner e entrato nel progetto tramite referral.\n\n` +
                  `Partner: ${referralResult.partnerName || 'n/d'}\n` +
                  `Codice: ${referralResult.partnerCode || referralCodeForTracking}\n` +
                  `Email partner: ${referralResult.partnerEmail || 'n/d'}\n` +
                  `Cliente: ${fullName || 'n/d'}\n` +
                  `Preventivo: ${quoteNumber}\n` +
                  `Commissione creata: ${referralResult.commissionCreated ? 'si' : 'no'}\n` +
                  `Importo commissione: EUR ${Number(referralResult.commissionAmountEur || 0).toFixed(2)}\n` +
                  `Stato: pending\n\n` +
                  `Evento tracciato su Supabase.`,
              });
              console.log(`✅ Notifica referral admin inviata a ${LEAD_NOTIFICATION_EMAIL}`);
            } catch (adminNotifyErr) {
              console.warn('⚠️ Notifica referral admin non inviata:', adminNotifyErr?.message || adminNotifyErr);
            }
          }
        }
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
      totalPrice: effectiveTotalPrice,
      depositPercentage: effectiveDepositPercentage,
      depositTotal: effectiveDepositTotal,
      remainingTotal: effectiveRemainingTotal,
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
      totalPrice: effectiveTotalPrice,
      depositPercentage: effectiveDepositPercentage,
      depositTotal: effectiveDepositTotal,
      remainingTotal: effectiveRemainingTotal,
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

    if (isValidEmail(LEAD_NOTIFICATION_EMAIL)) {
      try {
        await sendGmailText({
          env: process.env,
          to: LEAD_NOTIFICATION_EMAIL,
          subject: `[Interno] Preventivo inviato al cliente - ${quoteNumber}`,
          text:
            `Il preventivo completo (HTML + PDF) e stato inviato al cliente.\n\n` +
            `Preventivo: ${quoteNumber}\n` +
            `Cliente: ${fullName || 'n/d'}\n` +
            `Email cliente: ${to}\n` +
            `Tipologia: ${businessType || 'n/d'}\n` +
            `Localita: ${location || 'n/d'}\n` +
            `Mq: ${squareMeters || 'n/d'}\n` +
            `Totale progetto (ex IVA): EUR ${Number(effectiveTotalPrice || 0).toFixed(2)}\n` +
            `Codice referral: ${referralCodeForTracking || 'n/d'}\n` +
            `Gmail message id: ${data.id || 'n/d'}\n`,
        });
        console.log(`✅ Notifica interna invio preventivo a ${LEAD_NOTIFICATION_EMAIL}`);
      } catch (internalErr) {
        console.warn('⚠️ Notifica interna post-invio preventivo non inviata:', internalErr?.message || internalErr);
      }
    }
    
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
      projectDescription,
      discountCode,
      referralCode
    } = req.body || {};
    
    // Validazione minima
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).send('Email non valida.');
    }
    
    const dynamicPricing = await calculateDynamicPricing({
      squareMeters,
      discountCode,
      referralCode,
      manualOverridePrice: null,
      isAdminOverride: false,
    });
    const referralCodeForTracking =
      dynamicPricing.appliedReferralCode ||
      (typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '');
    const effectiveTotalPrice = Number(dynamicPricing.finalPriceExVat || totalPrice || 0);
    const effectiveDepositPercentage = FIXED_CLIENT_DEPOSIT_PERCENT;
    const depositBase = effectiveTotalPrice * (effectiveDepositPercentage / 100);
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
      totalPrice: effectiveTotalPrice,
      depositPercentage: effectiveDepositPercentage,
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
        total_price: effectiveTotalPrice || 0,
        deposit_percentage: effectiveDepositPercentage || 30,
        deposit_total: depositTotal || 0,
        remaining_total: 0,
        pricing_rule_id: dynamicPricing.pricingRuleId || null,
        pricing_rule_name: dynamicPricing.pricingRuleName || null,
        applied_discount_code: dynamicPricing.appliedDiscountCode || null,
        applied_referral_code: referralCodeForTracking || null,
        stripe_url: '',
        payment_link_expires_at: null,
        source: 'lead-save',
        lead_source: 'web_form',
        funnel_step: 'lead_created',
        notes: '',
        metadata: {
          airtableId: airtableId || null,
          businessCategories,
          pricingRuleId: dynamicPricing.pricingRuleId,
          pricingRuleName: dynamicPricing.pricingRuleName,
          appliedDiscountCode: dynamicPricing.appliedDiscountCode,
          appliedReferralCode: referralCodeForTracking || null,
        },
        timestamp_utc: newLead.timestamp,
      });
      if (supabaseResult?.ok) {
        console.log(`✅ Lead sincronizzato con Supabase: ${newLead.id}`);
      }
    } catch (supabaseErr) {
      console.warn('⚠️ Errore sincronizzazione Supabase (lead-save):', supabaseErr.message);
    }

    try {
      crmBridgeResult = await ensureCrmClientAndPracticeFromLead({
        leadNumber: newLead.leadNumber || leadNumber,
        fullName,
        email,
        phone,
        companyName,
        vatNumber,
        location,
        businessType,
        squareMeters,
        totalPrice: effectiveTotalPrice,
        depositTotal,
      });
      if (crmBridgeResult?.ok) {
        console.log(`✅ Bridge CRM creato: practice ${crmBridgeResult.practiceId} (${crmBridgeResult.referenceCode})`);
      }
    } catch (crmBridgeErr) {
      console.warn('⚠️ Errore bridge automatico verso CRM:', crmBridgeErr?.message || crmBridgeErr);
    }

    if (isValidEmail(LEAD_NOTIFICATION_EMAIL)) {
      try {
        await sendGmailText({
          env: process.env,
          to: LEAD_NOTIFICATION_EMAIL,
          subject: `Nuova richiesta preventivo - ${newLead.leadNumber || leadNumber}`,
          text:
            `Nuova richiesta preventivo ricevuta.\n\n` +
            `Lead: ${newLead.leadNumber || leadNumber}\n` +
            `Cliente: ${fullName || 'n/d'}\n` +
            `Email: ${email}\n` +
            `Telefono: ${phone || 'n/d'}\n` +
            `Tipologia: ${businessType || 'n/d'}\n` +
            `Localita: ${location || 'n/d'}\n` +
            `Mq: ${squareMeters || 'n/d'}\n` +
            `Prezzo progetto (ex IVA): EUR ${Number(effectiveTotalPrice || 0).toFixed(2)}\n` +
            `Acconto (%): ${Number(effectiveDepositPercentage || 30).toFixed(0)}\n` +
            `Codice sconto: ${dynamicPricing.appliedDiscountCode || 'n/d'}\n` +
            `Codice referral: ${referralCodeForTracking || 'n/d'}\n\n` +
            `I dati sono stati inviati a Supabase e Airtable.`,
        });
      } catch (notifyErr) {
        console.warn('⚠️ Notifica nuovo lead non inviata:', notifyErr?.message || notifyErr);
      }
    }
    
    console.log(`✅ Lead salvato: ${fullName} (${email})`);
    if (airtableId) {
      console.log(`✅ Sincronizzato con Airtable ID: ${airtableId}`);
    }
    
    res.json({
      ok: true,
      leadId: newLead.id,
      leadNumber: newLead.leadNumber || leadNumber,
      airtableId,
      crmBridge: crmBridgeResult,
    });
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

