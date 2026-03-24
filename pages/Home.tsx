
import React from 'react';
import { AppView } from '../types';

interface HomeProps {
  setView: (view: AppView) => void;
}

const Home: React.FC<HomeProps> = ({ setView }) => {
  return (
    <div className="animate-reveal">
      {/* Hero Section */}
      <section className="relative min-h-[82vh] md:min-h-[95vh] bg-brand-dark flex items-center pt-20 md:pt-24 px-4 sm:px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
            className="w-full h-full object-cover grayscale opacity-20"
            alt="Strategic planning detail"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/90 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 py-16 md:py-32">
          <div className="max-w-5xl space-y-8 md:space-y-12">
            <div className="inline-flex items-center gap-6 text-brand-gold">
              <span className="w-8 md:w-16 h-[1px] bg-brand-gold/60"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.28em] md:tracking-[0.6em]">Protocollo Emotive</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-9xl font-black leading-[0.95] md:leading-[0.85] text-white serif tracking-tight md:tracking-tighter">
              Dall'Ansia <br/>
              <span className="italic text-brand-gold">all'Asset.</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-white/95 max-w-2xl leading-relaxed font-light italic">
              Aprire un locale non è una scommessa, è un'operazione di <span className="text-white font-medium underline decoration-brand-gold/50">ingegneria commerciale</span>. Proteggi il tuo capitale.
            </p>

            <div className="pt-4 md:pt-10">
              <button 
                onClick={() => setView(AppView.CREATE_QUOTE)}
                className="btn-emotive-primary !px-8 sm:!px-12 md:!px-16 !py-5 md:!py-8 !text-[10px] sm:!text-xs !tracking-[0.14em] md:!tracking-[0.2em] !shadow-2xl hover:scale-105 active:scale-95 transition-transform"
              >
                Crea Preventivo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Protocollo E.M.O.T.I.V.E Manifesto Section */}
      <section className="py-20 md:py-40 bg-[#050505] text-white px-4 sm:px-6 overflow-hidden relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.02] text-[20rem] font-black pointer-events-none select-none italic whitespace-nowrap">
          CONTROL
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-24 items-center">
            <div className="space-y-8 md:space-y-12">
              <div className="space-y-4 md:space-y-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.6em] text-brand-gold">Perché scegliere Emotive</span>
                <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold serif italic leading-[1.1] tracking-tight">
                  Protocollo <br/> <span className="text-brand-gold tracking-widest">E.M.O.T.I.V.E.®</span>
                </h2>
                <p className="text-lg md:text-2xl font-black uppercase tracking-tight md:tracking-tighter text-white/90">
                  Nessun errore. Nessuna improvvisazione. Solo controllo.
                </p>
              </div>
              
              <div className="space-y-6 md:space-y-8 text-gray-400 text-base md:text-lg font-light leading-relaxed italic">
                <p>
                  La maggior parte dei problemi nei locali commerciali nasce da una progettazione debole: decisioni prese “a sensazione”, passaggi scollegati, tempi che saltano.
                </p>
                <p>
                  <span className="text-white font-bold">Emotive esiste per impedire tutto questo.</span> Con il Protocollo E.M.O.T.I.V.E.® anticipiamo ogni errore prima che diventi un costo o un ritardo. Non correggiamo a posteriori: <span className="text-brand-gold font-bold">preveniamo a monte</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 pt-6 md:pt-8 border-t border-white/10">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-gold mb-2">Risultato</p>
                  <p className="text-sm font-bold italic text-white">Render rispettato senza interpretazioni.</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-gold mb-2">Esecuzione</p>
                  <p className="text-sm font-bold italic text-white">Precisione millimetrica Boncordo Arredi.</p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="aspect-[4/5] bg-white/5 border border-white/10 p-6 relative z-10 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop" 
                  alt="Production Detail"
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-105 transition-transform duration-[2000ms]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-12 left-12 right-12 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-gold">Impegno Operativo</p>
                  <p className="text-3xl font-black serif italic text-white">Dalla visione <br/> alla realtà.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Logic Grid */}
      <section className="py-16 md:py-40 bg-white px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 md:gap-16">
            <div className="space-y-6 md:space-y-8 p-6 md:p-12 bg-[#fdfdfd] border border-gray-100 hover:shadow-2xl transition-all duration-500">
              <div className="w-12 h-12 bg-brand-dark text-brand-gold flex items-center justify-center font-black text-xs">01</div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight md:tracking-tighter">Analisi Sistemica</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Analizziamo flussi, funzioni, impianti e identità del locale come un sistema unico. Ogni scelta è verificata e validata prima di essere costruita.
              </p>
            </div>
            <div className="space-y-6 md:space-y-8 p-6 md:p-12 bg-[#fdfdfd] border border-gray-100 hover:shadow-2xl transition-all duration-500">
              <div className="w-12 h-12 bg-brand-dark text-brand-gold flex items-center justify-center font-black text-xs">02</div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight md:tracking-tighter">Produzione Diretta</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                La connessione con Boncordo Arredi elimina la distanza tra progetto e realtà. Progettiamo, produciamo e montiamo noi. Stesse mani, stesso controllo.
              </p>
            </div>
            <div className="space-y-6 md:space-y-8 p-6 md:p-12 bg-[#fdfdfd] border border-gray-100 hover:shadow-2xl transition-all duration-500">
              <div className="w-12 h-12 bg-brand-dark text-brand-gold flex items-center justify-center font-black text-xs">03</div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight md:tracking-tighter">Workflow Digitale</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Comunicazione veloce, digitale e continua. Un unico interlocutore, decisioni rapide, zero dispersioni. Meno riunioni, più avanzamento reale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Area */}
      <section className="py-20 md:py-48 bg-[#050505] text-center px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.03] text-[20rem] font-black pointer-events-none select-none italic whitespace-nowrap">
          EROS BONCORDO
        </div>
        
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-16 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-8xl font-black serif italic text-white leading-tight md:leading-none tracking-tight md:tracking-tighter">
            Smetti di sperare. <br/> <span className="text-brand-gold">Inizia a misurare.</span>
          </h2>
          <p className="text-gray-400 text-base md:text-2xl font-light max-w-2xl mx-auto leading-relaxed italic">
            Emotive non è per chi vuole provare. È per chi vuole aprire, ristrutturare o crescere <span className="text-white font-bold underline decoration-brand-gold/30">senza errori</span>.
          </p>
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={() => setView(AppView.CREATE_QUOTE)}
              className="btn-emotive-primary !px-8 sm:!px-12 md:!px-20 !py-5 md:!py-10 !text-[10px] md:!text-xs !tracking-[0.14em] md:!tracking-[0.2em] shadow-2xl"
            >
              Crea il tuo Preventivo
            </button>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] md:tracking-[0.5em] text-gray-500 italic">Protocollo E.M.O.T.I.V.E.® — Eros Boncordo Lead Strategist</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
