import React from 'react';
import { Property, NICHE_COLORS } from '@/data/platformData';
import { X, Globe, MapPin, Inbox, DollarSign, Trophy, Activity, ExternalLink } from 'lucide-react';
import Sparkline from './Sparkline';

const PropertyDetail: React.FC<{ p: Property | null; onClose: () => void }> = ({ p, onClose }) => {
  if (!p) return null;
  const ni = NICHE_COLORS[p.niche] || '#38bdf8';
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-[#0a0e1a] border-l border-slate-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-[#0a0e1a]/90 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ni}1a` }}>
              <Globe className="w-4 h-4" style={{ color: ni }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{p.domain}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-center">
              <Trophy className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <p className="text-xl font-bold text-white font-mono">#{p.rankPosition}</p>
              <p className="text-[10px] text-slate-500">Avg Rank</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-center">
              <Inbox className="w-4 h-4 mx-auto text-sky-400 mb-1" />
              <p className="text-xl font-bold text-white font-mono">{p.monthlyLeads}</p>
              <p className="text-[10px] text-slate-500">Leads/mo</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-center">
              <DollarSign className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <p className="text-xl font-bold text-white font-mono">{p.mrr ? `$${p.mrr}` : '—'}</p>
              <p className="text-[10px] text-slate-500">MRR</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white font-medium">Ranking Trajectory</p>
              <span className="text-[10px] font-mono text-emerald-400">↑ improving</span>
            </div>
            <Sparkline data={p.trend} invert color={ni} width={320} height={60} />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <p className="text-sm text-white font-medium mb-3">Asset Status</p>
            <div className="space-y-2 text-sm">
              <Row label="Niche" value={p.niche} />
              <Row label="Tracked Keywords" value={`${p.keywords}`} />
              <Row label="Health Score" value={`${p.health}%`} />
              <Row label="Status" value={p.status} />
              <Row label="Rental Client" value={p.client || 'Available — leasing'} />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg">
              <Activity className="w-4 h-4" /> View Logs
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 text-sm font-semibold py-2.5 rounded-lg">
              <ExternalLink className="w-4 h-4" /> Visit Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className="text-slate-200 capitalize">{value}</span>
  </div>
);

export default PropertyDetail;
