
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
