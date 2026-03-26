import React, { useState } from 'react';
import { AppView, UserRole } from '../types';
import { isSupabaseAuthConfigured, supabase } from '../lib/supabase';

/** Dopo il magic link Supabase reindirizza qui: deve coincidere con Site URL / Redirect URLs nel progetto Supabase. */
function getMagicLinkRedirectUrl(): string {
  const fromEnv = (import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim().replace(/\r?\n/g, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}#auth-portal`;
  }
  return '';
}

function getCrmAppUrl(): string {
  const fromEnv = (import.meta.env.VITE_CRM_APP_URL || '').trim().replace(/\r?\n/g, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv;
  }
  return 'https://crm-next-app-two.vercel.app';
}

interface AuthPortalProps {
  setView: (view: AppView) => void;
  role: UserRole;
  userEmail: string;
  onRefreshSession: () => Promise<void>;
}

const AuthPortal: React.FC<AuthPortalProps> = ({ setView, role, userEmail, onRefreshSession }) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const crmAppUrl = getCrmAppUrl();

  const sendMagicLink = async () => {
    if (!supabase || !isSupabaseAuthConfigured) {
      setError('Auth non configurata: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }
    if (!email.includes('@')) {
      setError('Inserisci una email valida.');
      return;
    }

    setIsSending(true);
    setError('');
    setMessage('');
    try {
      const redirectTo = getMagicLinkRedirectUrl();
      if (!redirectTo) {
        throw new Error('URL di redirect non disponibile. In produzione imposta VITE_AUTH_REDIRECT_URL.');
      }
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) throw signInError;
      setMessage('Magic link inviato. Apri la tua email e clicca il link.');
    } catch (err: any) {
      setError(err?.message || 'Errore invio magic link.');
    } finally {
      setIsSending(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage('Logout eseguito.');
    setError('');
    await onRefreshSession();
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-[#0a0a0a] border border-brand-gold/30 p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-black">Accesso Sicuro</p>
          <h1 className="text-3xl md:text-4xl text-white font-black serif italic">Auth Portal</h1>
          <p className="text-sm text-gray-400 mt-3">
            Accesso admin/partner con email magic link. Nessuna password da ricordare.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
          <p className="text-xs text-gray-300">
            Stato accesso: <span className="text-brand-gold font-bold uppercase">{role}</span>
            {userEmail ? ` (${userEmail})` : ''}
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="email"
              placeholder="admin@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border-b border-white/20 p-4 text-white outline-none"
            />
            <button
              onClick={sendMagicLink}
              disabled={isSending}
              className="btn-emotive-primary !py-3 !px-6 !text-[10px] disabled:opacity-50"
            >
              {isSending ? 'INVIO...' : 'Invia Magic Link'}
            </button>
          </div>
          {message && <p className="text-green-400 text-xs">{message}</p>}
          {error && <p className="text-red-300 text-xs">{error}</p>}
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-6 flex flex-col sm:flex-row gap-3">
          <a
            href={crmAppUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-emotive-primary !py-3 !px-6 !text-[10px] text-center"
          >
            Apri CRM Operativo
          </a>
          <button onClick={() => setView(AppView.ADMIN_PRICING)} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">
            Vai ad Admin Pricing
          </button>
          <button onClick={() => setView(AppView.PARTNER_DASHBOARD)} className="border border-brand-gold text-brand-gold px-6 py-3 text-[10px] uppercase tracking-wider">
            Vai a Dashboard Partner
          </button>
          <button onClick={signOut} className="border border-white/20 text-white px-6 py-3 text-[10px] uppercase tracking-wider">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;

