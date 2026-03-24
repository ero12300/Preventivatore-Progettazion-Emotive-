
import React, { useEffect, useState } from 'react';
import { AppView, ProjectState } from '../types';

interface SuccessProps {
  setView: (view: AppView) => void;
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
}

const Success: React.FC<SuccessProps> = ({ setView, projectState, setProjectState }) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || projectState.isPaid) return;

    let cancelled = false;
    setVerifying(true);
    setVerifyError(null);

    fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<{ payment_status?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.payment_status === 'paid') {
          setProjectState((prev) => ({ ...prev, isPaid: true }));
        } else {
          setVerifyError('Pagamento non ancora confermato da Stripe. Se hai appena pagato, attendi 10–20 secondi e ricarica la pagina.');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setVerifyError(typeof e?.message === 'string' ? e.message : 'Errore verifica pagamento.');
      })
      .finally(() => {
        if (cancelled) return;
        setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectState.isPaid, setProjectState]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-40 bg-[#fcfcfc] animate-reveal">
      <div className="max-w-4xl w-full text-center space-y-16">
        <div className="space-y-8">
          <div className="w-28 h-28 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl">
             <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
             </svg>
          </div>
          <h1 className="text-6xl md:text-8xl font-black serif italic text-brand-dark tracking-tighter">Incarico Attivato.</h1>
          <p className="text-2xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed italic">
            Acconto ricevuto. Il protocollo <span className="text-brand-dark font-medium underline decoration-brand-gold">EMOTIVE</span> di Eros Boncordo è ora ufficialmente al tuo servizio.
          </p>
        </div>

        {(verifying || verifyError) && (
          <div className="max-w-3xl mx-auto text-left bg-white border border-gray-100 p-6 md:p-8 shadow-sm">
            {verifying && (
              <p className="text-sm text-gray-500 font-light">
                Verifica pagamento Stripe in corso...
              </p>
            )}
            {verifyError && (
              <p className="text-sm text-red-600 font-medium">
                {verifyError}
              </p>
            )}
          </div>
        )}

        <div className="bg-white p-12 md:p-20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-gray-100 text-left max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-brand-gold"></div>
          <h2 className="text-2xl font-black serif italic mb-10 text-brand-dark">Prossimi Passaggi Esecutivi</h2>
          
          <div className="space-y-12">
            <div className="flex gap-8 items-start">
              <div className="w-12 h-12 bg-brand-dark text-brand-gold flex items-center justify-center font-black flex-shrink-0 text-lg shadow-xl">01</div>
              <div className="space-y-3">
                <h3 className="font-black text-lg uppercase tracking-widest">Contatto Lead Strategist</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">Eros Boncordo ti contatterà entro 24h per coordinare i rilievi tecnici nel tuo locale a {projectState.location}.</p>
              </div>
            </div>
            
            <div className="flex gap-8 items-start">
              <div className="w-12 h-12 bg-brand-dark text-brand-gold flex items-center justify-center font-black flex-shrink-0 text-lg shadow-xl">02</div>
              <div className="space-y-3">
                <h3 className="font-black text-lg uppercase tracking-widest">Workflow 15 Giorni</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">Il tuo progetto completo (Step 1 & 2) sarà pronto per la revisione finale entro 15 giorni lavorativi.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-20 border-t border-gray-100 flex flex-wrap justify-center gap-16">
            <div className="text-center">
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.4em] mb-3 font-black">Stato Progetto</p>
              <p className="text-base font-black text-green-600">FASE 01 - RILIEVI</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.4em] mb-3 font-black">Referente Tecnico</p>
              <p className="text-base font-black text-brand-dark uppercase">EROS BONCORDO</p>
            </div>
        </div>

        <button 
          onClick={() => setView(AppView.HOME)}
          className="text-[11px] font-black uppercase tracking-[0.5em] text-brand-gold hover:text-brand-dark transition-all mt-12 underline underline-offset-8"
        >
          Torna alla Home Page
        </button>
      </div>
    </div>
  );
};

export default Success;
