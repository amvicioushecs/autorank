import React from 'react';
import { Globe, MapPin, ArrowUp, ArrowDown, Minus, MoreVertical } from 'lucide-react';
import { Property, NICHE_COLORS } from '@/data/platformData';
import Sparkline from './Sparkline';

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  rented: { label: 'Rented', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  ranking: { label: 'Ranking', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  building: { label: 'Building', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  optimizing: { label: 'Optimizing', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  leasing: { label: 'Leasing', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
};

const healthColor = (h: number) => (h >= 85 ? '#34d399' : h >= 65 ? '#fbbf24' : '#fb7185');

const PropertyCard: React.FC<{ p: Property; onClick: () => void }> = ({ p, onClick }) => {
  const st = statusMeta[p.status];
  const ni:string = NICHE_COLORS[p.niche] || '#38bdf8';
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-4 hover:border-slate-600 hover:shadow-xl hover:shadow-sky-900/20 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ni}1a` }}>
            <Globe className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: ni }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">{p.domain}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3" /> {p.city}
            </div>
          </div>
        </div>
        <button onClick={(e) => e.stopPropagation()} className="text-slate-600 hover:text-slate-300 shrink-0">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: ni, background: `${ni}1a` }}>{p.niche}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ color: st.color, background: st.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} /> {st.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Rank</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-white font-mono">#{p.rankPosition}</span>
            {p.rankChange < 0 ? (
              <span className="text-[10px] text-emerald-400 flex items-center"><ArrowUp className="w-3 h-3" />{Math.abs(p.rankChange)}</span>
            ) : p.rankChange > 0 ? (
              <span className="text-[10px] text-rose-400 flex items-center"><ArrowDown className="w-3 h-3" />{p.rankChange}</span>
            ) : (
              <span className="text-[10px] text-slate-500 flex items-center"><Minus className="w-3 h-3" /></span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Leads/mo</p>
          <span className="text-lg font-bold text-white font-mono">{p.monthlyLeads}</span>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">MRR</p>
          <span className="text-lg font-bold font-mono" style={{ color: p.mrr ? '#34d399' : '#64748b' }}>
            {p.mrr ? `$${p.mrr}` : '—'}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-800">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase">Health</span>
            <span className="text-[10px] font-mono" style={{ color: healthColor(p.health) }}>{p.health}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden w-full max-w-[120px]">
            <div className="h-full rounded-full" style={{ width: `${p.health}%`, background: healthColor(p.health) }} />
          </div>
        </div>
        <Sparkline data={p.trend} invert color={ni} />
      </div>

      {p.client && (
        <div className="mt-3 text-[11px] text-slate-400 bg-slate-800/40 rounded-md px-2 py-1.5 truncate">
          <span className="text-slate-600">Rented to</span> <span className="text-slate-200 font-medium">{p.client}</span>
        </div>
      )}
    </div>
  );
};

export default PropertyCard;
