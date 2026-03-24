
import React, { useState, useEffect } from 'react';
import { AppView, ProjectState } from '../types';

/** Acconto protocollo: fisso, non modificabile dal cliente. */
const FIXED_DEPOSIT_PERCENT = 30;

interface CreateQuoteProps {
  setView: (view: AppView) => void;
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
}

const CreateQuote: React.FC<CreateQuoteProps> = ({ setView, projectState, setProjectState }) => {
  const [formStep, setFormStep] = useState(1);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadSaveError, setLeadSaveError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState(projectState.discountCode || '');
  const [referralCode, setReferralCode] = useState(projectState.referralCode || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    (projectState.businessType || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );

  const businessCategories = [
    "Ristorante Fine Dining",
    "Ristorante Casual Dining",
    "Bistrot Contemporaneo",
    "Trattoria Moderna",
    "Pizzeria Classica",
    "Pizzeria Gourmet",
    "Hamburgeria / Smash Burger",
    "Fast Food / Street Food",
    "Bar / Caffetteria",
    "Lounge Bar / Cocktail Bar",
    "Enoteca / Wine Bar",
    "Gelateria",
    "Pasticceria / Bakery",
    "Centro estetico luxury",
    "Centro estetico medical",
    "Spa / Beauty Retreat",
    "Parrucchiere / Beauty Salon",
    "Palestra / Wellness",
    "Boutique Hotel / Hospitality",
    "Retail Fashion Boutique",
    "Retail Beauty / Profumeria",
    "Showroom Arredo / Design",
    "Concept Store",
    "Studio Professionale",
    "Clinica Odontoiatrica",
    "Farmacia / Parafarmacia"
  ];

  const syncBusinessTypeField = (categories: string[]) => {
    setProjectState({ ...projectState, businessType: categories.join(', ') });
  };

  const toggleCategory = (category: string) => {
    const isSelected = selectedCategories.includes(category);
    const updated = isSelected
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(updated);
    syncBusinessTypeField(updated);
  };

  const addCustomCategory = () => {
    const value = customCategoryInput.trim();
    if (!value) return;
    if (selectedCategories.includes(value)) {
      setCustomCategoryInput('');
      return;
    }
    const updated = [...selectedCategories, value];
    setSelectedCategories(updated);
    syncBusinessTypeField(updated);
    setCustomCategoryInput('');
  };

  const removeCategory = (category: string) => {
    const updated = selectedCategories.filter((c) => c !== category);
    setSelectedCategories(updated);
    syncBusinessTypeField(updated);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setProjectState({ ...projectState, totalPrice: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSaving(true);
    setLeadSaveError(null);
    try {
      const clientFullName = `${projectState.firstName} ${projectState.lastName}`.trim();
      const response = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: projectState.firstName,
          lastName: projectState.lastName,
          clientName: clientFullName,
          email: projectState.email,
          phone: projectState.phone,
          businessType: projectState.businessType,
          location: projectState.location,
          squareMeters: projectState.squareMeters,
          companyName: projectState.companyName,
          vatNumber: projectState.vatNumber,
          address: projectState.address,
          projectDescription: projectState.projectDescription,
          discountCode: projectState.discountCode,
          referralCode: projectState.referralCode,
          totalPrice: projectState.totalPrice,
          depositPercentage: FIXED_DEPOSIT_PERCENT,
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(responseText || 'Errore salvataggio lead.');
      }

      let payload: any = {};
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = {};
      }

      setProjectState({
        ...projectState,
        leadCaptured: true,
        leadCapturedAt: new Date().toISOString(),
        leadNumber: payload?.leadNumber || projectState.leadNumber,
      });
    } catch (err: any) {
      setLeadSaveError(err?.message || 'Errore salvataggio lead. Riprova.');
      return;
    } finally {
      setLeadSaving(false);
    }

    // Vai alla preview del preventivo dopo salvataggio lead
    setView(AppView.QUOTE_PREVIEW);
  };

  const calculatePriceFromMq = async (opts?: { silent?: boolean }) => {
    const squareMeters = Number(projectState.squareMeters || 0);
    if (!Number.isFinite(squareMeters) || squareMeters <= 0) {
      if (!opts?.silent) {
        setPricingError('Inserisci una metratura valida maggiore di 0.');
      }
      return false;
    }

    setPricingLoading(true);
    setPricingError(null);
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squareMeters: projectState.squareMeters,
          discountCode: (projectState.discountCode || discountCode).trim() || undefined,
          referralCode: (projectState.referralCode || referralCode).trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Errore calcolo prezzo automatico.');
      }
      setProjectState({
        ...projectState,
        totalPrice: Number(data.finalPriceExVat || 0),
        depositPercentage: FIXED_DEPOSIT_PERCENT,
        pricingRuleId: data.pricingRuleId || undefined,
        pricingRuleLabel: data.pricingRuleName || undefined,
        appliedDiscountCode: data.appliedDiscountCode || undefined,
        appliedReferralCode: data.appliedReferralCode || undefined,
        discountCode: discountCode.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      return true;
    } catch (err: any) {
      setPricingError(err?.message || 'Errore calcolo prezzo automatico.');
      return false;
    } finally {
      setPricingLoading(false);
    }
  };

  const goToStep2 = async () => {
    const ok = await calculatePriceFromMq();
    if (ok) {
      setFormStep(2);
    }
  };

  const isStep1Valid = selectedCategories.length > 0 && projectState.location && Number(projectState.squareMeters || 0) > 0;
  const isStep2Valid = projectState.firstName && projectState.lastName && projectState.email;
  const isStep3Valid = projectState.totalPrice > 0;

  useEffect(() => {
    if (formStep !== 3) return;
    setProjectState((p) => (p.depositPercentage === FIXED_DEPOSIT_PERCENT ? p : { ...p, depositPercentage: FIXED_DEPOSIT_PERCENT }));
  }, [formStep, setProjectState]);

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-16 md:pb-40 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 md:mb-20 text-center space-y-5 md:space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 md:w-16 h-[1px] bg-brand-gold"></div>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] md:tracking-[0.5em] text-brand-gold">Crea Preventivo</span>
            <div className="w-10 md:w-16 h-[1px] bg-brand-gold"></div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-black serif leading-tight text-white italic tracking-tight md:tracking-tighter">
            Genera il tuo <br/> <span className="text-brand-gold">Preventivo EMOTIVE.</span>
          </h1>
          <p className="text-base md:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed italic">
            Inserisci i dati del cliente, personalizza il prezzo e genera un preventivo professionale.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#0a0a0a] p-5 sm:p-6 md:p-20 shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-brand-gold/40">
          <div className="absolute top-0 right-0 w-1 h-full bg-brand-gold"></div>
          
          <div className="mb-8 md:mb-16 flex justify-between items-end border-b border-white/5 pb-5 md:pb-10 gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-4xl font-black serif italic text-white leading-none">Nuovo Preventivo</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] md:tracking-[0.5em] font-bold">Protocollo EMOTIVE®</p>
            </div>
            <div className="text-[10px] md:text-[11px] font-black text-brand-gold tracking-[0.15em] md:tracking-[0.3em] uppercase bg-brand-gold/10 px-3 md:px-6 py-2">
              0{formStep} / 03
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* STEP 1: Dati Progetto */}
            {formStep === 1 && (
              <div className="space-y-12 animate-reveal">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight border-l-4 border-brand-gold pl-6">
                  Dati Progetto
                </h3>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                    Tipologia Locale (selezione multipla)
                  </label>
                  <div className="bg-white/5 border border-white/20 p-5 max-h-72 overflow-auto">
                    <div className="grid md:grid-cols-2 gap-3">
                      {businessCategories.map((cat) => {
                        const checked = selectedCategories.includes(cat);
                        return (
                          <label key={cat} className={`flex items-start gap-3 p-3 border ${checked ? 'border-brand-gold bg-brand-gold/10' : 'border-white/10 bg-white/0'} cursor-pointer transition-all`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCategory(cat)}
                              className="mt-1"
                            />
                            <span className="text-sm text-white">{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Aggiungi una tipologia personalizzata"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory();
                        }
                      }}
                      className="w-full bg-white/5 border-b border-white/20 p-4 text-sm focus:border-brand-gold transition-all text-white outline-none font-light"
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="px-5 py-3 bg-brand-gold text-black text-[10px] font-black uppercase tracking-wider"
                    >
                      Aggiungi
                    </button>
                  </div>

                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="px-3 py-1 bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-[11px]"
                          title="Rimuovi categoria"
                        >
                          {cat} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-gray-500 italic mt-2">
                    💡 Puoi selezionare più categorie e aggiungerne di personalizzate
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                      Città
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="es. Milano" 
                      value={projectState.location} 
                      onChange={e => setProjectState({...projectState, location: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/20 p-6 text-white outline-none font-light" 
                    />
                  </div>
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                      Superficie (MQ) <span className="text-white font-normal">(obbligatorio)</span>
                    </label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="es. 120" 
                      value={projectState.squareMeters || ''} 
                      onChange={e => setProjectState({...projectState, squareMeters: e.target.value})}
                      onBlur={() => { void calculatePriceFromMq({ silent: true }); }}
                      className="w-full bg-white/5 border-b border-white/20 p-6 text-white outline-none font-light" 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                    Incentivi Commerciali <span className="text-gray-500 font-normal">(opzionale)</span>
                  </label>
                  <div className="grid md:grid-cols-2 gap-6">
                    <input
                      type="text"
                      placeholder="Codice sconto"
                      value={discountCode}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDiscountCode(value);
                        setProjectState({ ...projectState, discountCode: value });
                      }}
                      className="w-full bg-white/5 border-b border-white/20 p-4 text-sm focus:border-brand-gold transition-all text-white outline-none font-light"
                    />
                    <input
                      type="text"
                      placeholder="Codice referral"
                      value={referralCode}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReferralCode(value);
                        setProjectState({ ...projectState, referralCode: value });
                      }}
                      className="w-full bg-white/5 border-b border-white/20 p-4 text-sm focus:border-brand-gold transition-all text-white outline-none font-light"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                    Descrizione Progetto <span className="text-gray-500 font-normal">(opzionale)</span>
                  </label>
                  <textarea 
                    rows={4}
                    placeholder="Esempio: Obiettivo: aumentare ticket medio e percezione premium. Target: donna 30-55 alto spendente. Stile: elegante, caldo, minimal-luxury. Criticita operative: flussi reception/cabine e privacy nelle aree trattamento." 
                    value={projectState.projectDescription || ''} 
                    onChange={e => setProjectState({...projectState, projectDescription: e.target.value})} 
                    className="w-full bg-white/5 border border-white/20 p-6 text-white outline-none font-light resize-none focus:border-brand-gold transition-all" 
                  />
                  <p className="text-[10px] text-gray-500 italic">
                    Scrivi 2-4 frasi su obiettivo, target, stile desiderato e criticita operative: la relazione concept sara molto piu precisa.
                  </p>
                </div>
                
                <button 
                  type="button" 
                  onClick={goToStep2}
                  disabled={!isStep1Valid || pricingLoading} 
                  className="w-full btn-emotive-primary !py-5 md:!py-8 !text-[10px] md:!text-[11px] !tracking-[0.12em] md:!tracking-[0.2em] !text-black shadow-2xl mt-4 md:mt-6 disabled:opacity-30"
                >
                  {pricingLoading ? 'CALCOLO PREZZO...' : 'Prosegui - Dati Cliente'}
                </button>
                {pricingError && (
                  <p className="text-red-300 text-xs font-semibold">{pricingError}</p>
                )}
              </div>
            )}

            {/* STEP 2: Dati Cliente */}
            {formStep === 2 && (
              <div className="space-y-12 animate-reveal">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight border-l-4 border-brand-gold pl-6">
                  Dati Cliente
                </h3>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                      Nome
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Mario" 
                      value={projectState.firstName} 
                      onChange={e => setProjectState({...projectState, firstName: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/20 p-6 text-white outline-none font-light" 
                    />
                  </div>
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                      Cognome
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Rossi" 
                      value={projectState.lastName} 
                      onChange={e => setProjectState({...projectState, lastName: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/20 p-6 text-white outline-none font-light" 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block opacity-70">
                    Email
                  </label>
                  <input 
                    type="email" 
                    required 
                    placeholder="mario.rossi@email.com" 
                    value={projectState.email} 
                    onChange={e => setProjectState({...projectState, email: e.target.value})} 
                    className="w-full bg-white/5 border-b border-white/20 p-6 text-white outline-none font-light" 
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 block">
                      Telefono <span className="text-gray-600 font-light lowercase">(opzionale)</span>
                    </label>
                    <input 
                      type="tel" 
                      placeholder="+39 123 456 7890" 
                      value={projectState.phone || ''} 
                      onChange={e => setProjectState({...projectState, phone: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/10 p-6 text-white outline-none font-light focus:border-white/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 block">
                      Ragione Sociale <span className="text-gray-600 font-light lowercase">(opzionale)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Nome Azienda S.r.l." 
                      value={projectState.companyName || ''} 
                      onChange={e => setProjectState({...projectState, companyName: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/10 p-6 text-white outline-none font-light focus:border-white/30 transition-all" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 block">
                      P. IVA <span className="text-gray-600 font-light lowercase">(opzionale)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="12345678901" 
                      value={projectState.vatNumber || ''} 
                      onChange={e => setProjectState({...projectState, vatNumber: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/10 p-6 text-white outline-none font-light focus:border-white/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 block">
                      Indirizzo <span className="text-gray-600 font-light lowercase">(opzionale)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Via, Città, CAP" 
                      value={projectState.address || ''} 
                      onChange={e => setProjectState({...projectState, address: e.target.value})} 
                      className="w-full bg-white/5 border-b border-white/10 p-6 text-white outline-none font-light focus:border-white/30 transition-all" 
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 pt-8">
                  <button 
                    type="button" 
                    onClick={() => setFormStep(1)} 
                    className="w-full sm:w-1/3 border border-white/10 py-5 md:py-8 font-black uppercase tracking-[0.14em] md:tracking-widest text-[10px] text-white/50 hover:bg-white/5 transition-all"
                  >
                    Indietro
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormStep(3)} 
                    disabled={!isStep2Valid}
                    className="w-full sm:w-2/3 btn-emotive-primary !py-5 md:!py-8 !text-[10px] md:!text-[11px] !tracking-[0.12em] md:!tracking-[0.2em] !text-black !font-black shadow-2xl active:scale-95 disabled:opacity-30"
                  >
                    Prosegui - Prezzo
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Prezzo Personalizzato */}
            {formStep === 3 && (
              <div className="space-y-12 animate-reveal">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight border-l-4 border-brand-gold pl-6">
                  Prezzo Automatico da Metratura
                </h3>

                <div className="bg-white/5 p-5 md:p-12 border border-white/10 space-y-6 md:space-y-10">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block">
                      Prezzo Totale Progetto (€)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-black text-brand-gold">€</span>
                      <input 
                        type="number" 
                        required 
                        min="0"
                        step="0.01"
                        placeholder="990.00" 
                        value={projectState.totalPrice || ''} 
                        onChange={handlePriceChange}
                        readOnly
                        className="w-full bg-white/10 border-2 border-brand-gold/40 p-4 md:p-6 pl-12 md:pl-16 text-2xl md:text-3xl font-black text-white outline-none focus:border-brand-gold transition-all cursor-not-allowed opacity-90" 
                      />
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      Prezzo calcolato automaticamente dalla fascia mq
                      {projectState.pricingRuleLabel ? ` (${projectState.pricingRuleLabel})` : ''}.
                    </p>
                    <button
                      type="button"
                      onClick={() => { void calculatePriceFromMq(); }}
                      disabled={pricingLoading}
                      className="text-[10px] uppercase tracking-wider text-brand-gold border border-brand-gold/40 px-4 py-2 disabled:opacity-50"
                    >
                      {pricingLoading ? 'AGGIORNAMENTO...' : 'Ricalcola Prezzo da MQ'}
                    </button>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold block">
                      Percentuale acconto
                    </label>
                    <div className="w-full bg-white/10 border-2 border-brand-gold/40 p-4 md:p-6 flex items-center justify-between cursor-not-allowed opacity-95">
                      <span className="text-xl md:text-2xl font-black text-white">{FIXED_DEPOSIT_PERCENT}%</span>
                      <span className="text-sm font-bold text-brand-gold/80 uppercase tracking-wider">Fisso · Protocollo EMOTIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      L’acconto è sempre il {FIXED_DEPOSIT_PERCENT}% del totale progetto (IVA 22% applicata sull’importo acconto).
                    </p>
                  </div>

                  {/* Preview Calcoli */}
                  <div className="bg-brand-dark p-8 border-l-4 border-brand-gold space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold mb-6">Riepilogo Prezzi</h4>
                    
                    <div className="flex justify-between items-center text-white border-b border-white/10 pb-3">
                      <span className="text-sm font-light">Prezzo Originale (esclusa IVA)</span>
                      <span className="text-lg line-through text-gray-500">€ {(projectState.totalPrice * 1.5).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="bg-brand-gold/10 p-4 rounded border border-brand-gold/30 mb-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold block mb-1">⏰ OFFERTA 15 GIORNI</span>
                          <span className="text-sm font-light text-white">Prezzo Scontato (esclusa IVA)</span>
                        </div>
                        <span className="text-2xl font-black text-brand-gold">€ {projectState.totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-[9px] text-gray-400 mt-2 italic">
                        Risparmio: € {(projectState.totalPrice * 0.5).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-33%)
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-white border-b border-white/10 pb-3">
                      <span className="text-sm font-light">Acconto ({FIXED_DEPOSIT_PERCENT}% + IVA 22%)</span>
                      <span className="text-xl font-black text-brand-gold">
                        € {(projectState.totalPrice * (FIXED_DEPOSIT_PERCENT / 100) * 1.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-white pt-2">
                      <span className="text-sm font-light">Saldo (rimanente + IVA 22%)</span>
                      <span className="text-lg font-bold">
                        € {(projectState.totalPrice * (1 - FIXED_DEPOSIT_PERCENT / 100) * 1.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 pt-8">
                  <button 
                    type="button" 
                    onClick={() => setFormStep(2)} 
                    className="w-full sm:w-1/3 border border-white/10 py-5 md:py-8 font-black uppercase tracking-[0.14em] md:tracking-widest text-[10px] text-white/50 hover:bg-white/5 transition-all"
                  >
                    Indietro
                  </button>
                  <button 
                    type="submit" 
                    disabled={leadSaving}
                    className="w-full sm:w-2/3 btn-emotive-primary !py-5 md:!py-8 !text-[10px] md:!text-[11px] !tracking-[0.12em] md:!tracking-[0.2em] !text-black !font-black shadow-2xl active:scale-95"
                  >
                    {leadSaving ? 'SALVATAGGIO DATI...' : 'Genera Preventivo'}
                  </button>
                </div>
                {leadSaveError && (
                  <p className="text-red-300 text-xs font-semibold">{leadSaveError}</p>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateQuote;
