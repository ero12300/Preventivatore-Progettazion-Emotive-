import React, { useEffect, useState } from 'react';
import { AppView, UserRole } from '../types';
import { isSupabaseAuthConfigured, supabase } from '../lib/supabase';

interface PartnerDashboardProps {
  setView: (view: AppView) => void;
  role: UserRole;
}

interface PartnerCommission {
  id: string;
  amount_eur: number;
  status: string;
  created_at: string;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ setView, role }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);

  useEffect(() => {
    const load = async () => {
      if (role !== 'partner') return;
      if (!supabase || !isSupabaseAuthConfigured) {
        setError('Auth Supabase non configurata.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data, error: queryError } = await supabase
          .from('partner_commissions')
          .select('id, amount_eur, status, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (queryError) throw queryError;
        setCommissions((data || []) as PartnerCommission[]);
      } catch (err: any) {
        setError(err?.message || 'Errore caricamento commissioni partner.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  if (role !== 'partner') {
    return (
      <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-[#0a0a0a] border border-white/10 p-6 space-y-3">
          <h1 className="text-white text-2xl font-black serif italic">Dashboard Partner</h1>
          <p className="text-sm text-gray-400">Accesso non autorizzato. Entra con account partner dal portale auth.</p>
          <button onClick={() => setView(AppView.AUTH_PORTAL)} className="btn-emotive-primary !py-3 !px-6 !text-[10px]">
            Vai ad Auth Portal
          </button>
        </div>
      </div>
    );
  }

  const totalPending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount_eur || 0), 0);
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount_eur || 0), 0);

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-[#0a0a0a] border border-brand-gold/30 p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-black">Partner Area</p>
          <h1 className="text-3xl md:text-4xl text-white font-black serif italic">Dashboard Commissioni</h1>
          <p className="text-sm text-gray-400 mt-2">Visualizzi solo i tuoi dati. Pagamenti trasparenti e tracciati.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] border border-white/10 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Commissioni in attesa</p>
            <p className="text-3xl text-brand-gold font-black mt-2">€ {totalPending.toFixed(2)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/10 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Commissioni pagate</p>
            <p className="text-3xl text-green-400 font-black mt-2">€ {totalPaid.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-black">Storico</h2>
            <button onClick={() => setView(AppView.AUTH_PORTAL)} className="text-[10px] uppercase tracking-wider text-brand-gold border border-brand-gold/40 px-4 py-2">
              Auth Portal
            </button>
          </div>
          {loading && <p className="text-xs text-gray-400">Caricamento...</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}
          {!loading && !error && commissions.length === 0 && (
            <p className="text-xs text-gray-500">Nessuna commissione registrata.</p>
          )}
          <div className="space-y-2">
            {commissions.map((row) => (
              <div key={row.id} className="border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white font-semibold">€ {Number(row.amount_eur || 0).toFixed(2)}</p>
                  <p className="text-[11px] text-gray-500">{new Date(row.created_at).toLocaleString('it-IT')}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${row.status === 'paid' ? 'text-green-400' : 'text-brand-gold'}`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;

