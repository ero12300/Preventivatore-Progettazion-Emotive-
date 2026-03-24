
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppView, ProjectState } from '../types';

interface QuotePreviewProps {
  setView: (view: AppView) => void;
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
}

const btnPrimaryClass =
  'w-full md:w-auto rounded-full bg-gradient-to-br from-brand-gold via-amber-400 to-amber-600 text-black py-3.5 md:py-4 px-6 md:px-12 text-[10px] font-black uppercase tracking-[0.12em] md:tracking-[0.18em] shadow-[0_10px_40px_rgba(212,175,55,0.35)] border border-white/25 hover:shadow-[0_14px_48px_rgba(212,175,55,0.45)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-45 disabled:shadow-none';

const btnSecondaryClass =
  'w-full md:w-auto rounded-full border-2 border-white/20 bg-white/[0.06] backdrop-blur-sm py-3.5 md:py-4 px-6 md:px-12 text-[10px] font-black uppercase tracking-[0.12em] md:tracking-[0.18em] text-white/90 hover:border-brand-gold/60 hover:bg-white/10 active:scale-[0.98] transition-all duration-200';

const QuotePreview: React.FC<QuotePreviewProps> = ({ setView, projectState, setProjectState }) => {
  const [isPaying, setIsPaying] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const projectRef = useRef(projectState);
  projectRef.current = projectState;
  const autoSendStartedRef = useRef(false);
  
  const vatRate = 0.22;
  const iban = "IT69J3609201600991466031460";
  
  // Calcoli basati su prezzo personalizzato
  const totalPrice = projectState.totalPrice;
  const depositPercentage = projectState.depositPercentage;
  const depositBase = totalPrice * (depositPercentage / 100);
  const depositVat = depositBase * vatRate;
  const depositTotal = depositBase + depositVat;
  
  const remainingBase = totalPrice * (1 - depositPercentage / 100);
  const remainingVat = remainingBase * vatRate;
  const remainingTotal = remainingBase + remainingVat;

  const clientFullName = `${projectState.firstName} ${projectState.lastName}`;
  const normalizedProjectDescription = (projectState.projectDescription || '').trim().toLowerCase();
  const isMeaningfulProjectDescription =
    normalizedProjectDescription.length >= 35 &&
    ![
      'test completo',
      'invio email',
      'pdf',
      'relazione ai',
      'prova invio',
      'test cliente',
    ].some((pattern) => normalizedProjectDescription.includes(pattern));

  const handleStripePayment = async () => {
    setIsPaying(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: projectState.firstName,
          lastName: projectState.lastName,
          clientName: clientFullName,
          email: projectState.email,
          businessType: projectState.businessType,
          location: projectState.location,
          totalPrice: projectState.totalPrice,
          depositPercentage: projectState.depositPercentage,
          depositTotal: depositTotal
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Errore creazione checkout Stripe.');
      }

      const data = await res.json() as { url?: string };
      if (!data.url) throw new Error('Stripe non ha restituito un URL di checkout.');

      window.location.assign(data.url);
    } catch (e: any) {
      console.error(e);
      setPaymentError(e?.message || 'Errore pagamento Stripe.');
      setIsPaying(false);
    }
  };

  const performSendQuoteEmail = useCallback(async () => {
    const ps = projectRef.current;
    const customerEmail = ps.email || '';
    const nameForLead = `${ps.firstName} ${ps.lastName}`.trim();

    if (!customerEmail || !customerEmail.includes('@')) {
      setEmailStatus('error');
      setEmailError('Email non valida. Torna indietro e controlla il campo email.');
      return;
    }

    setIsPreparing(true);
    setEmailStatus('sending');
    setEmailError(null);

    try {
      if (!ps.leadCaptured) {
        const leadRes = await fetch('/api/leads/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: ps.firstName,
            lastName: ps.lastName,
            clientName: nameForLead,
            email: customerEmail,
            phone: ps.phone,
            businessType: ps.businessType,
            location: ps.location,
            squareMeters: ps.squareMeters,
            companyName: ps.companyName,
            vatNumber: ps.vatNumber,
            address: ps.address,
            projectDescription: ps.projectDescription,
            discountCode: ps.discountCode,
            referralCode: ps.referralCode,
            totalPrice: ps.totalPrice,
            depositPercentage: ps.depositPercentage,
          }),
        });

        if (!leadRes.ok) {
          const text = await leadRes.text();
          console.warn('Errore salvataggio lead:', text);
        } else {
          setProjectState((prev) => ({
            ...prev,
            leadCaptured: true,
            leadCapturedAt: new Date().toISOString(),
          }));
        }
      }

      const depBase = ps.totalPrice * (ps.depositPercentage / 100);
      const depTotal = depBase + depBase * vatRate;
      const remBase = ps.totalPrice * (1 - ps.depositPercentage / 100);
      const remTotal = remBase + remBase * vatRate;

      const emailRes = await fetch('/api/gmail/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerEmail,
          firstName: ps.firstName,
          lastName: ps.lastName,
          clientName: nameForLead,
          companyName: ps.companyName,
          vatNumber: ps.vatNumber,
          address: ps.address,
          phone: ps.phone,
          businessType: ps.businessType,
          location: ps.location,
          squareMeters: ps.squareMeters,
          projectDescription: ps.projectDescription,
          discountCode: ps.discountCode,
          referralCode: ps.referralCode,
          totalPrice: ps.totalPrice,
          depositPercentage: ps.depositPercentage,
          depositTotal: depTotal,
          remainingTotal: remTotal,
        }),
      });

      if (!emailRes.ok) {
        const text = await emailRes.text();
        throw new Error(text || 'Errore invio email.');
      }

      setProjectState((prev) => ({
        ...prev,
        quotePdfSentAt: new Date().toISOString(),
      }));
      setEmailStatus('sent');
    } catch (e: any) {
      console.error(e);
      setEmailStatus('error');
      setEmailError(e?.message || 'Errore invio email.');
    } finally {
      setIsPreparing(false);
    }
  }, [setProjectState]);

  useEffect(() => {
    if (projectState.quotePdfSentAt) {
      setEmailStatus('sent');
      return;
    }
    if (!projectState.email?.includes('@')) {
      setEmailStatus('error');
      setEmailError('Email mancante. Torna al modulo e inserisci un indirizzo valido.');
      return;
    }
    if (autoSendStartedRef.current) return;
    autoSendStartedRef.current = true;
    void performSendQuoteEmail();
  }, [projectState.quotePdfSentAt, projectState.email, performSendQuoteEmail]);

  const handleResendEmail = () => {
    void performSendQuoteEmail();
  };

  const handleEditQuote = () => {
    autoSendStartedRef.current = false;
    setProjectState((prev) => ({ ...prev, quotePdfSentAt: undefined }));
    setView(AppView.CREATE_QUOTE);
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] py-20 md:py-32 px-3 sm:px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 animate-reveal">
        
        {/* Header Actions */}
        <div className="bg-brand-dark text-white p-5 sm:p-6 md:p-16 border-l-4 md:border-l-8 border-brand-gold shadow-2xl no-print">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] md:tracking-[0.5em] text-brand-gold">Preventivo Generato</span>
                <h2 className="text-2xl md:text-5xl font-black serif italic leading-tight">
                  Il tuo preventivo è pronto, <br/> <span className="text-brand-gold">{clientFullName}</span>
                </h2>
                <p className="text-gray-400 text-sm max-w-xl font-light leading-relaxed">
                  {emailStatus === 'sending' || isPreparing
                    ? 'Stiamo inviando il preventivo completo con PDF all’indirizzo email che hai indicato. Attendi qualche secondo.'
                    : emailStatus === 'sent'
                      ? `Abbiamo inviato il preventivo con PDF a ${projectState.email}. Controlla anche la cartella spam. Puoi procedere con l’acconto (Stripe o bonifico) quando preferisci.`
                      : emailStatus === 'error'
                        ? 'Non siamo riusciti a inviare l’email automaticamente. Usa il pulsante qui sotto per riprovare.'
                        : 'Al termine della compilazione il preventivo viene inviato automaticamente alla tua email con PDF allegato. Qui sotto puoi pagare l’acconto o modificare i dati prima dell’invio.'}
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full md:w-auto">
                 <button 
                    type="button"
                    onClick={handleEditQuote}
                    className={btnSecondaryClass}
                 >
                    Modifica dati
                 </button>
                 <button 
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isPreparing}
                    className={btnPrimaryClass}
                 >
                    {isPreparing ? 'Invio in corso…' : emailStatus === 'sent' ? 'Reinvia email con PDF' : 'Invia di nuovo il PDF'}
                 </button>
                 {emailStatus === 'sent' && (
                   <p className="text-[10px] text-green-400 font-black uppercase tracking-widest">✓ Preventivo inviato alla tua email</p>
                 )}
                 {emailStatus === 'error' && (
                   <p className="text-[10px] text-red-300 font-black uppercase tracking-widest">{emailError || 'Errore invio email.'}</p>
                 )}
              </div>
           </div>
        </div>

        {/* Formal Paper Container (The Proposal) */}
        <div className="bg-white pdf-shadow p-5 sm:p-6 md:p-24 relative overflow-hidden blueprint-bg border border-gray-100 pdf-container text-brand-dark">
          <div className="absolute top-5 left-5 md:top-12 md:left-12 flex flex-col items-center opacity-20 md:opacity-30">
            <div className="w-3 h-3 bg-brand-gold mb-3"></div>
            <span className="font-black text-xl md:text-3xl tracking-tight md:tracking-tighter uppercase [writing-mode:vertical-lr] rotate-180">EMOTIVE</span>
          </div>

          <div className="relative z-10">
            {/* Quote Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10 md:mb-24 pl-10 sm:pl-14 md:pl-20">
              <div className="space-y-1">
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em] md:tracking-[0.5em] text-brand-gold">Team progettazione</p>
                <p className="text-lg md:text-xl font-black uppercase tracking-tight md:tracking-tighter">EMOTIVE®</p>
                <p className="text-[9px] md:text-[10px] text-gray-500 italic uppercase tracking-[0.1em] md:tracking-widest">Protocollo Architettonico E.M.O.T.I.V.E.®</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.16em] md:tracking-[0.5em] text-gray-300 mb-2">Ref. Proposta</p>
                <p className="text-sm font-bold uppercase">#EM-{Math.floor(Math.random()*9000)+1000}</p>
                <p className="text-[9px] text-gray-400 mt-2">{new Date().toLocaleDateString('it-IT')}</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-20 mb-10 md:mb-24 pl-10 sm:pl-14 md:pl-0">
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] md:tracking-[0.4em] text-gray-300 border-b border-gray-50 pb-3">Committente</h3>
                <div className="space-y-2">
                  <p className="text-3xl md:text-4xl font-black serif italic tracking-tight md:tracking-tighter">{clientFullName}</p>
                  {projectState.companyName && (
                    <p className="text-sm text-gray-600 font-bold">{projectState.companyName}</p>
                  )}
                  <p className="text-xs text-gray-400 tracking-[0.08em] md:tracking-[0.2em] uppercase">
                    {projectState.businessType} / {projectState.location}
                  </p>
                  {projectState.squareMeters && (
                    <p className="text-xs text-gray-400">Superficie: {projectState.squareMeters} MQ</p>
                  )}
                  {projectState.vatNumber && (
                    <p className="text-xs text-gray-400">P. IVA: {projectState.vatNumber}</p>
                  )}
                  {projectState.address && (
                    <p className="text-xs text-gray-400">{projectState.address}</p>
                  )}
                  <p className="text-xs text-gray-400">{projectState.email}</p>
                  {projectState.phone && (
                    <p className="text-xs text-gray-400">{projectState.phone}</p>
                  )}
                </div>
              </div>
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] md:tracking-[0.4em] text-gray-300 border-b border-gray-50 pb-3">Investimento Totale Protocollo</h3>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-4">
                    <span className="text-2xl line-through text-gray-300">€ {(totalPrice * 1.5).toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                    <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded">-33%</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-gold tracking-tight md:tracking-tighter">
                      € {totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      <span className="text-[10px] font-light text-gray-400 uppercase tracking-widest ml-2">+ IVA</span>
                    </span>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="text-xs font-black text-yellow-700 uppercase tracking-wider">⏰ OFFERTA LIMITATA</p>
                    <p className="text-sm text-yellow-600 mt-1">Prezzo valido per <span className="font-black">15 giorni</span> dalla ricezione preventivo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Description (if exists) */}
            {isMeaningfulProjectDescription && (
              <div className="mb-24 bg-gray-50 p-8 border-l-4 border-brand-gold">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-4">Brief Progetto</h4>
                <p className="text-sm text-gray-700 leading-relaxed font-light italic">
                  {projectState.projectDescription}
                </p>
              </div>
            )}

            {/* Steps Breakdown */}
            <div className="space-y-12 md:space-y-24 mb-10 md:mb-24">
               <div className="relative">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-brand-gold/20 pb-4 mb-5 md:mb-8 gap-2">
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.6em] text-brand-gold">FASE A: RILIEVI E IMPIANTI</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase italic tracking-[0.08em] md:tracking-widest">Attivabile con Acconto {depositPercentage}%</span>
                  </div>
                  <div className="pl-2 md:pl-6">
                     <ul className="space-y-4 list-none text-sm text-gray-700 font-normal leading-relaxed">
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">1.</span>
                          <span>Rilievi tecnici e mappatura completa dello spazio</span>
                        </li>
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">2.</span>
                          <span>Impostazione attrezzature, arredi e suddivisioni funzionali per normative vigenti</span>
                        </li>
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">3.</span>
                          <span>Planimetrie esecutive per Impianti <span className="italic">(Elettrici, Idrici, Opere Murarie)</span></span>
                        </li>
                     </ul>
                  </div>
               </div>

               <div className="relative">
                  <div className="flex items-center justify-between border-b border-brand-gold/20 pb-4 mb-5 md:mb-8">
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.6em] text-brand-gold">FASE B: CONCEPT E RENDER</span>
                  </div>
                  <div className="pl-2 md:pl-6">
                     <ul className="space-y-4 list-none text-sm text-gray-700 font-normal leading-relaxed">
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">4.</span>
                          <span>Ideazione Moodboard e Concept Identitario unico</span>
                        </li>
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">5.</span>
                          <span>Render 3D Fotorealistici ad Alta Fedeltà</span>
                        </li>
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">⚡</span>
                          <span>Saldo al completamento fasi progettuali</span>
                        </li>
                        <li className="flex gap-4 items-start">
                          <span className="text-brand-gold font-black text-lg min-w-[30px]">7.</span>
                          <span>Preventivazione arredi su misura Boncordo: attrezzature, arredamenti, accessori ed alberghiero.</span>
                        </li>
                     </ul>
                  </div>
               </div>
            </div>

            {/* Politiche di Revisione */}
            <div className="bg-[#fffbf0] p-5 md:p-12 border-l-4 border-brand-gold mb-10 md:mb-24">
               <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.16em] md:tracking-[0.6em] text-brand-dark mb-6 md:mb-8 text-center">Politiche di Revisione</h4>
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white p-6 border border-gray-100 rounded-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold flex items-center justify-center rounded-full font-black text-sm">📐</div>
                        <h5 className="text-sm font-black uppercase tracking-wider">Planimetrie</h5>
                     </div>
                     <p className="text-xs text-gray-600 leading-relaxed mb-3">
                        Fino a <span className="font-black text-brand-gold">5 revisioni incluse</span> per le planimetrie esecutive.
                     </p>
                     <p className="text-[10px] text-gray-500 italic">
                        Oltre le 5 revisioni, il preventivo dovrà essere rimodulato in base alle modifiche richieste.
                     </p>
                  </div>
                  <div className="bg-white p-6 border border-gray-100 rounded-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold flex items-center justify-center rounded-full font-black text-sm">🎨</div>
                        <h5 className="text-sm font-black uppercase tracking-wider">Render 3D</h5>
                     </div>
                     <p className="text-xs text-gray-600 leading-relaxed mb-3">
                        Fino a <span className="font-black text-brand-gold">3 revisioni incluse</span> per i render fotorealistici.
                     </p>
                     <p className="text-[10px] text-gray-500 italic">
                        Oltre le 3 revisioni, il preventivo dovrà essere rimodulato in base alle modifiche richieste.
                     </p>
                  </div>
               </div>
               <div className="mt-6 pt-6 border-t border-brand-gold/20 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                     ℹ️ Le revisioni si intendono per correzioni e aggiustamenti minori. Modifiche sostanziali al progetto richiedono una nuova valutazione.
                  </p>
               </div>
            </div>

            {/* Payment & Activation */}
            <div className="bg-[#fafafa] p-5 md:p-12 border border-gray-100 mb-10 md:mb-24">
               <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.16em] md:tracking-[0.6em] text-brand-dark mb-6 md:mb-10 text-center">Protocollo di Attivazione Immediata</h4>
               <div className="grid md:grid-cols-2 gap-8 md:gap-16">
                  <div className="space-y-6">
                     <p className="text-[10px] font-black uppercase text-brand-gold tracking-[0.4em] mb-4">Metodo 01: Stripe Secure</p>
                     <div className="bg-white p-5 md:p-8 border border-gray-100 rounded-sm space-y-4 shadow-sm">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">Acconto attivazione {depositPercentage}% + IVA 22%</p>
                        <p className="text-2xl font-black text-brand-dark">€ {depositTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Link pagamento Stripe valido 24 ore</p>
                        <button
                          type="button"
                          onClick={handleStripePayment}
                          disabled={isPaying}
                          className="w-full rounded-2xl bg-brand-dark text-white py-4 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-gold hover:text-black transition-all disabled:opacity-50"
                        >
                          {isPaying ? 'REINDIRIZZAMENTO...' : 'PAGA ORA →'}
                        </button>
                        {paymentError && (
                          <p className="text-[10px] text-red-600 font-bold">
                            {paymentError}
                          </p>
                        )}
                     </div>
                  </div>
                  <div className="space-y-6">
                     <p className="text-[10px] font-black uppercase text-brand-gold tracking-[0.4em] mb-4">Metodo 02: Bonifico Istantaneo</p>
                     <div className="bg-white p-5 md:p-8 border border-gray-100 rounded-sm space-y-4 shadow-sm">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">IBAN Emotive S.r.l.</p>
                        <p className="text-sm font-mono font-bold select-all tracking-tighter">{iban}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Intestato a Emotive Srl</p>
                        <p className="text-[8px] text-gray-400 uppercase leading-relaxed font-bold">L'attivazione avviene alla ricezione del CRO o del bonifico istantaneo.</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-12 pt-8 md:pt-16 border-t-2 border-brand-dark/5">
               <div className="space-y-3 text-center md:text-left">
                  <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.14em] md:tracking-[0.5em] text-gray-300">Investimento Protocollo EMOTIVE®</p>
                  <div className="flex items-center gap-4 justify-center md:justify-start">
                     <p className="text-2xl line-through text-gray-300 serif italic">€ {(totalPrice * 1.5).toLocaleString('it-IT', { minimumFractionDigits: 0 })}</p>
                     <div className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded uppercase">Sconto -33%</div>
                  </div>
                  <div className="flex items-baseline gap-4 justify-center md:justify-start">
                     <p className="text-4xl sm:text-5xl md:text-6xl font-black serif italic tracking-tight md:tracking-tighter text-brand-gold">€ {totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                     <p className="text-sm font-light text-gray-400 uppercase tracking-widest">+ IVA</p>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mt-4 max-w-md">
                     <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider">⏰ Offerta valida 15 giorni</p>
                  </div>
                  <p className="text-[9px] text-brand-gold font-bold uppercase tracking-widest italic mt-2">L'importo viene scalato dal preventivo di BONCORDO | Arredi Commerciali</p>
               </div>
               <div className="w-full md:w-auto bg-brand-dark text-white p-6 md:p-12 md:min-w-[360px] shadow-2xl relative overflow-hidden text-center md:transform md:scale-105">
                  <div className="absolute top-0 right-0 w-2 h-full bg-brand-gold"></div>
                  <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.14em] md:tracking-[0.5em] text-brand-gold mb-4 md:mb-6 italic">Quota Attivazione ({depositPercentage}% + IVA)</p>
                  <p className="text-4xl md:text-5xl font-black text-brand-gold tracking-tight md:tracking-tighter">€ {depositTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-6 font-bold">Inizio lavori entro 24 ore dal saldo acconto</p>
               </div>
            </div>
          </div>
        </div>

        {/* Footer CTA no-print */}
        <div className="bg-[#050505] p-6 md:p-16 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-12 no-print border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.6)]">
           <div className="space-y-4 text-center md:text-left">
              <h4 className="text-2xl md:text-3xl font-black serif italic text-brand-gold tracking-tight">Inizia il tuo percorso oggi.</h4>
              <p className="text-gray-400 text-sm max-w-sm font-light">Il team EMOTIVE® segue la strategia del tuo locale per massimizzare il ROI del design, con continuità operativa fino all’arredo.</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-8 w-full md:w-auto">
              <button 
                type="button"
                onClick={handleStripePayment}
                disabled={isPaying}
                className="rounded-2xl bg-white text-black py-4 md:py-8 px-6 md:px-16 text-[10px] md:text-[11px] font-black uppercase tracking-[0.12em] md:tracking-widest hover:bg-brand-gold transition-all active:scale-95 shadow-xl"
              >
                {isPaying ? 'ATTENDERE...' : `PAGA €${depositTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
              </button>
              <button 
                type="button"
                onClick={() => setView(AppView.SUCCESS)} 
                className="rounded-2xl border-2 border-white/25 text-white py-4 md:py-8 px-6 md:px-16 text-[10px] md:text-[11px] font-black uppercase tracking-[0.12em] md:tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                HO GIÀ FATTO IL BONIFICO
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default QuotePreview;
