import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Inbox, TrendingUp, Loader2, ShieldAlert } from 'lucide-react';
import { fetchPortalView, PortalView as PortalData } from '@/lib/portalApi';

type State = { status: 'loading' } | { status: 'invalid' } | { status: 'error'; message: string } | { status: 'ok'; data: PortalData };

const PortalView: React.FC = () => {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchPortalView(token)
      .then((data) => { if (!cancelled) setState(data ? { status: 'ok', data } : { status: 'invalid' }); })
      .catch((e) => { if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }); });
    return () => { cancelled = true; };
  }, [token]);

  if (state.status === 'loading') {
    return <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center text-slate-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading your dashboard…</div>;
  }
  if (state.status !== 'ok') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-8 h-8 text-rose-400 mb-3" />
        <h1 className="text-white font-semibold">This link is invalid or has expired</h1>
        <p className="text-slate-500 text-sm mt-1">{state.status === 'error' ? state.message : 'Ask your provider for a new access link.'}</p>
      </div>
    );
  }

  const { property, leads } = state.data;
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <p className="text-xs text-slate-500">Client dashboard</p>
          <h1 className="text-xl font-bold">{property.client || property.domain}</h1>
          <p className="text-sm text-slate-400">{property.domain} · {property.niche} · {property.city}</p>
        </header>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-800/50 p-4"><Inbox className="w-4 h-4 text-sky-400 mb-1" /><p className="text-2xl font-mono font-bold">{property.monthlyLeads ?? 0}</p><p className="text-xs text-slate-500">Leads this month</p></div>
          <div className="rounded-lg bg-slate-800/50 p-4"><TrendingUp className="w-4 h-4 text-emerald-400 mb-1" /><p className="text-2xl font-mono font-bold">#{property.rankPosition ?? '—'}</p><p className="text-xs text-slate-500">Google position</p></div>
        </div>
        <section className="rounded-lg border border-slate-800">
          <h2 className="px-4 py-3 text-sm font-semibold border-b border-slate-800">Recent leads</h2>
          {leads.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No leads yet.</p>
          ) : (
            <ul>
              {leads.map((l) => (
                <li key={l.id} className="px-4 py-3 border-b border-slate-800/60 last:border-0 flex justify-between text-sm">
                  <span>{l.name} · <span className="text-slate-400">{l.service}</span></span>
                  <span className="text-slate-500">{new Date(l.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default PortalView;
