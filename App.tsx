
import React, { useState, useEffect } from 'react';
import { AppView, ProjectState, UserRole } from './types';
import Header from './components/Header';
import Home from './pages/Home';
import CreateQuote from './pages/CreateQuote';
import Success from './pages/Success';
import QuotePreview from './pages/QuotePreview';
import AdminPricing from './pages/AdminPricing';
import AuthPortal from './pages/AuthPortal';
import PartnerDashboard from './pages/PartnerDashboard';
import { supabase, isSupabaseAuthConfigured } from './lib/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [userRole, setUserRole] = useState<UserRole>('unknown');
  const [userEmail, setUserEmail] = useState('');
  const [projectState, setProjectState] = useState<ProjectState>({
    firstName: '',
    lastName: '',
    email: '',
    businessType: '',
    location: '',
    totalPrice: 990,
    depositPercentage: 30,
    isPaid: false
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppView;
      if (Object.values(AppView).includes(hash)) {
        setCurrentView(hash);
      } else {
        setCurrentView(AppView.HOME);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const refreshSessionAndRole = async () => {
    if (!supabase || !isSupabaseAuthConfigured) {
      setUserRole('unknown');
      setUserEmail('');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user || null;
    if (!user) {
      setUserRole('unknown');
      setUserEmail('');
      return;
    }
    setUserEmail(user.email || '');
    const { data: profileData, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (error || !profileData?.role) {
      setUserRole('unknown');
      return;
    }
    setUserRole(profileData.role as UserRole);
  };

  useEffect(() => {
    void refreshSessionAndRole();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshSessionAndRole();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const setView = (view: AppView) => {
    window.location.hash = view;
    window.scrollTo(0, 0);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME:
        return <Home setView={setView} />;
      case AppView.CREATE_QUOTE:
        return <CreateQuote setView={setView} projectState={projectState} setProjectState={setProjectState} />;
      case AppView.QUOTE_PREVIEW:
        return <QuotePreview setView={setView} projectState={projectState} setProjectState={setProjectState} />;
      case AppView.SUCCESS:
        return <Success setView={setView} projectState={projectState} setProjectState={setProjectState} />;
      case AppView.ADMIN_PRICING:
        if (userRole !== 'admin') {
          return (
            <AuthPortal
              setView={setView}
              role={userRole}
              userEmail={userEmail}
              onRefreshSession={refreshSessionAndRole}
            />
          );
        }
        return <AdminPricing setView={setView} />;
      case AppView.AUTH_PORTAL:
        return (
          <AuthPortal
            setView={setView}
            role={userRole}
            userEmail={userEmail}
            onRefreshSession={refreshSessionAndRole}
          />
        );
      case AppView.PARTNER_DASHBOARD:
        return <PartnerDashboard setView={setView} role={userRole} />;
      default:
        return <Home setView={setView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc]">
      <Header currentView={currentView} setView={setView} />
      <main className="flex-grow">
        {renderView()}
      </main>
      <footer className="bg-[#050505] text-white py-12 md:py-20 px-4 md:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter italic serif text-brand-gold">EMOTIVE</h2>
            <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
              Ingegneria dei flussi e design d'impatto per il settore hospitality e retail.
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] md:tracking-[0.4em] text-white/40">Partnership Esecutiva</p>
            <p className="text-sm font-bold">BONCORDO | Arredi Commerciali</p>
            <a
              href="https://www.boncordoarredi.it"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-brand-gold hover:underline"
            >
              www.boncordoarredi.it
            </a>
            <div className="mt-4 flex flex-col gap-2 md:items-end">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] md:tracking-[0.4em] text-white/40">Social & Sito</p>
              <div className="flex flex-row items-center gap-3">
                <a
                  href="https://www.instagram.com/emotive_format.concept"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
                    <path d="M17.6 6.6h.01" />
                  </svg>
                  <span className="sr-only">Instagram</span>
                </a>

                <a
                  href="https://www.facebook.com/Emotive.format.concept"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H9v3h2v8h3v-8h2.1l.9-3H14V9c0-.6.4-1 1-1Z" />
                  </svg>
                  <span className="sr-only">Facebook</span>
                </a>

                <a
                  href="https://t.me/emotivegroup"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7Z" />
                  </svg>
                  <span className="sr-only">Telegram</span>
                </a>

                <a
                  href="https://www.linkedin.com/company/emotive-format-and-concept/?viewAsMember=true"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 9h4v11H4z" />
                    <path d="M6 4.5a1.5 1.5 0 1 0 0 .01Z" />
                    <path d="M12 9h4v2c.7-1.2 2-2 3.6-2 2.4 0 4.4 1.7 4.4 5v6h-4v-5c0-1.3-.5-2-1.6-2-1 0-2 .7-2 2.2V20h-4V9Z" />
                  </svg>
                  <span className="sr-only">LinkedIn</span>
                </a>

                <a
                  href="https://www.emotivedesign.it/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Sito"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-brand-gold hover:border-brand-gold/60 hover:bg-brand-gold/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.5 2.5 2.5 15.5 0 18" />
                    <path d="M12 3c-2.5 2.5-2.5 15.5 0 18" />
                  </svg>
                  <span className="sr-only">Sito</span>
                </a>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-4 italic">
              &copy; {new Date().getFullYear()} EMOTIVE Studio. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
