import React, { useEffect, useMemo, useState } from 'react';
import { AppView } from '../types';

interface AdminPricingProps {
  setView: (view: AppView) => void;
}

interface PricingRule {
  id?: string;
  name: string;
  min_mq: number;
  max_mq: number;
  base_price_ex_vat: number;
  priority: number;
  is_active: boolean;
}

interface PartnerRow {
  id?: string;
  code: string;
  display_name: string;
  email: string;
  commission_percent: number;
  is_active: boolean;
}

const SECRET_STORAGE_KEY = 'emotive_admin_pricing_secret';

const AdminPricing: React.FC<AdminPricingProps> = ({ setView }) => {
  const [secret, setSecret] = useState('');
  const [loadingRules, setLoadingRules] = useState(false);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [ruleForm, setRuleForm] = useState<PricingRule>({
    name: 'Listino personalizzato',
    min_mq: 0,
    max_mq: 0,
    base_price_ex_vat: 0,
    priority: 100,
    is_active: true,
  });

  const [discountForm, setDiscountForm] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    max_uses: '',
    visible_to_client: true,
    is_active: true,
    notes_internal: '',
  });

  const [referralForm, setReferralForm] = useState({
    referral_code: '',
    reward_type: 'customer_discount',
    reward_value: 10,
    is_active: true,
    notes_internal: '',
  });

  const [partnerForm, setPartnerForm] = useState<PartnerRow>({
    code: '',
    display_name: '',
    email: '',
    commission_percent: 7,
    is_active: true,
  });

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-admin-pricing-secret': secret,
    }),
    [secret]
  );

  useEffect(() => {
    const savedSecret = localStorage.getItem(SECRET_STORAGE_KEY) || '';
    if (savedSecret) {
      setSecret(savedSecret);
    }
  }, []);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  const loadRules = async () => {
    if (!secret.trim()) {
      setError('Inserisci prima la chiave admin.');
      return;
    }
    setLoadingRules(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/pricing/rules', { headers: authHeaders });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore caricamento regole.');
      }
      setRules(Array.isArray(data.rules) ? data.rules : []);
      const partnersResponse = await fetch('/api/admin/partners', { headers: authHeaders });
      const partnersData = await partnersResponse.json();
      if (!partnersResponse.ok || !partnersData?.ok) {
        throw new Error(partnersData?.message || 'Errore caricamento partner.');
      }
      setPartners(Array.isArray(partnersData.partners) ? partnersData.partners : []);
      setStatus('Regole pricing caricate.');
    } catch (err: any) {
      setError(err?.message || 'Errore caricamento regole.');
    } finally {
      setLoadingRules(false);
    }
  };

  const saveSecret = () => {
    localStorage.setItem(SECRET_STORAGE_KEY, secret.trim());
    setStatus('Chiave admin salvata localmente su questo browser.');
    setError('');
  };

  const savePricingRule = async () => {
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/pricing/rules/upsert', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(ruleForm),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore salvataggio fascia.');
      }
      setStatus('Fascia prezzo salvata correttamente.');
      await loadRules();
      setRuleForm({
        name: 'Listino personalizzato',
        min_mq: 0,
        max_mq: 0,
        base_price_ex_vat: 0,
        priority: 100,
        is_active: true,
      });
    } catch (err: any) {
      setError(err?.message || 'Errore salvataggio fascia.');
    }
  };

  const saveDiscountCode = async () => {
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/discount-codes/upsert', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(discountForm),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore salvataggio codice sconto.');
      }
      setStatus(`Codice sconto ${discountForm.code.toUpperCase()} salvato.`);
    } catch (err: any) {
      setError(err?.message || 'Errore salvataggio codice sconto.');
    }
  };

  const saveReferralRule = async () => {
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/admin/referral-rules/upsert', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(referralForm),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore salvataggio referral.');
      }
      setStatus(`Referral ${referralForm.referral_code.toUpperCase()} salvato.`);
    } catch (err: any) {
      setError(err?.message || 'Errore salvataggio referral.');
    }
  };

  const savePartner = async () => {
    setError('');
    setStatus('');
    const cleanCode = partnerForm.code.trim().toUpperCase();
    const cleanEmail = partnerForm.email.trim();
    if (!cleanCode) {
      setError('Codice partner obbligatorio.');
      return;
    }
    if (!partnerForm.display_name.trim()) {
      setError('Nome partner obbligatorio.');
      return;
    }
    if (partnerForm.is_active && !isValidEmail(cleanEmail)) {
      setError('Email partner obbligatoria e valida se il partner è attivo.');
      return;
    }
    try {
      const response = await fetch('/api/admin/partners/upsert', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...partnerForm,
          code: cleanCode,
          email: cleanEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore salvataggio partner.');
      }
      setStatus(`Partner ${cleanCode} salvato.`);
      await loadRules();
      setPartnerForm({
        code: '',
        display_name: '',
        email: '',
        commission_percent: 7,
        is_active: true,
      });
    } catch (err: any) {
      setError(err?.message || 'Errore salvataggio partner.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-[#0a0a0a] border border-brand-gold/30 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-black">Area Riservata</p>
              <h1 className="text-2xl md:text-4xl text-white font-black serif italic">Admin Pricing</h1>
            </div>
            <button
              onClick={() => setView(AppView.CREATE_QUOTE)}
              className="border border-white/20 text-white px-4 py-2 text-xs uppercase tracking-wider"
            >
              Torna al preventivatore
            </button>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
          <label className="text-[10px] uppercase tracking-[0.2em] text-brand-gold font-black block">
            Chiave Admin (ADMIN_PRICING_SECRET)
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Inserisci la chiave admin"
              className="w-full bg-white/5 border-b border-white/20 p-4 text-white outline-none"
            />
            <button onClick={saveSecret} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">
              Salva chiave
            </button>
            <button
              onClick={loadRules}
              disabled={loadingRules}
              className="border border-brand-gold text-brand-gold px-6 py-3 text-[10px] uppercase tracking-wider disabled:opacity-50"
            >
              {loadingRules ? 'Carico...' : 'Aggiorna fasce'}
            </button>
          </div>
          {status && <p className="text-green-400 text-xs">{status}</p>}
          {error && <p className="text-red-300 text-xs">{error}</p>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Nuova / Modifica Fascia MQ</h2>
            <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Nome regola" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" placeholder="Min MQ" value={ruleForm.min_mq} onChange={(e) => setRuleForm({ ...ruleForm, min_mq: Number(e.target.value) })} />
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" placeholder="Max MQ" value={ruleForm.max_mq} onChange={(e) => setRuleForm({ ...ruleForm, max_mq: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" step="0.01" placeholder="Prezzo +IVA esclusa" value={ruleForm.base_price_ex_vat} onChange={(e) => setRuleForm({ ...ruleForm, base_price_ex_vat: Number(e.target.value) })} />
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" placeholder="Priority" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })} />
            </div>
            <button onClick={savePricingRule} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">Salva fascia</button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Fasce Correnti</h2>
            <div className="max-h-80 overflow-auto space-y-2">
              {rules.map((rule) => (
                <button
                  key={rule.id || `${rule.min_mq}-${rule.max_mq}`}
                  onClick={() => setRuleForm(rule)}
                  className="w-full text-left bg-white/5 border border-white/10 p-3 text-white hover:border-brand-gold/50"
                >
                  <p className="text-xs font-bold">{rule.min_mq} - {rule.max_mq} mq</p>
                  <p className="text-xs text-brand-gold">€ {Number(rule.base_price_ex_vat).toFixed(2)} + IVA</p>
                </button>
              ))}
              {rules.length === 0 && <p className="text-xs text-gray-500">Nessuna regola caricata.</p>}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Partner Venditori</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Codice (es. LUIGI23)" value={partnerForm.code} onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value.toUpperCase() })} />
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Nome partner" value={partnerForm.display_name} onChange={(e) => setPartnerForm({ ...partnerForm, display_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Email partner" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} />
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" step="0.01" placeholder="Commissione %" value={partnerForm.commission_percent} onChange={(e) => setPartnerForm({ ...partnerForm, commission_percent: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={partnerForm.is_active} onChange={(e) => setPartnerForm({ ...partnerForm, is_active: e.target.checked })} />
              Partner attivo (richiede email valida)
            </label>
            <button onClick={savePartner} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">Salva partner</button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Elenco Partner</h2>
            <div className="max-h-72 overflow-auto space-y-2">
              {partners.map((partner) => (
                <button
                  key={partner.id || partner.code}
                  onClick={() => setPartnerForm(partner)}
                  className="w-full text-left bg-white/5 border border-white/10 p-3 text-white hover:border-brand-gold/50"
                >
                  <p className="text-xs font-bold">{partner.code} - {partner.display_name}</p>
                  <p className="text-[11px] text-gray-400">{partner.email || 'email non impostata'}</p>
                  <p className="text-[11px] text-brand-gold">Commissione: {Number(partner.commission_percent || 0).toFixed(2)}%</p>
                </button>
              ))}
              {partners.length === 0 && <p className="text-xs text-gray-500">Nessun partner caricato.</p>}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Codice Sconto</h2>
            <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Codice (es. WELCOME10)" value={discountForm.code} onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="w-full bg-white/5 border-b border-white/20 p-3 text-white" value={discountForm.type} onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}>
                <option value="percentage">Percentuale</option>
                <option value="fixed">Fisso</option>
              </select>
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" step="0.01" value={discountForm.value} onChange={(e) => setDiscountForm({ ...discountForm, value: Number(e.target.value) })} />
            </div>
            <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Max usi (opzionale)" value={discountForm.max_uses} onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value })} />
            <button onClick={saveDiscountCode} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">Salva codice sconto</button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
            <h2 className="text-white text-lg font-black">Referral / Premio</h2>
            <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" placeholder="Referral code (es. PARTNER10)" value={referralForm.referral_code} onChange={(e) => setReferralForm({ ...referralForm, referral_code: e.target.value.toUpperCase() })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="w-full bg-white/5 border-b border-white/20 p-3 text-white" value={referralForm.reward_type} onChange={(e) => setReferralForm({ ...referralForm, reward_type: e.target.value })}>
                <option value="customer_discount">Sconto % cliente</option>
                <option value="customer_discount_fixed">Sconto fisso cliente</option>
                <option value="cash_commission">Commissione cash</option>
                <option value="credit">Credito</option>
              </select>
              <input className="w-full bg-white/5 border-b border-white/20 p-3 text-white" type="number" step="0.01" value={referralForm.reward_value} onChange={(e) => setReferralForm({ ...referralForm, reward_value: Number(e.target.value) })} />
            </div>
            <button onClick={saveReferralRule} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">Salva referral</button>
            <p className="text-[11px] text-gray-500">
              Se il referral è attivo, deve esistere un partner attivo con lo stesso codice e email valida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPricing;
