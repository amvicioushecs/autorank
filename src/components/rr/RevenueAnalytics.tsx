import React from 'react';
import { revenueHistory } from '@/data/platformData';
import { useRRData } from '@/contexts/RRDataContext';
import { DollarSign, TrendingUp, CreditCard, CheckCircle2, Clock } from 'lucide-react';

const MrrChart: React.FC = () => {
  const w = 560, h = 200, pad = 30;
  const data = revenueHistory;
  const max = Math.max(...data.map((d) => d.mrr)) * 1.1;
  const bw = (w - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {data.map((d, i) => {
        const bh = (d.mrr / max) * (h - pad * 2);
        const x = pad + i * bw + bw * 0.2;
        const bwid = bw * 0.6;
        return (
          <g key={d.month}>
            <rect x={x} y={h - pad - bh} width={bwid} height={bh} rx="4" fill="url(#mg)" />
            <text x={x + bwid / 2} y={h - pad - bh - 6} fill="#34d399" fontSize="9" textAnchor="middle" fontFamily="monospace">${(d.mrr / 1000).toFixed(1)}k</text>
            <text x={x + bwid / 2} y={h - 10} fill="#64748b" fontSize="9" textAnchor="middle">{d.month}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const RevenueAnalytics: React.FC = () => {
  const { properties } = useRRData();
  const rented = properties.filter((p) => p.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const mrr = rented.reduce((s, p) => s + p.mrr, 0);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { l: 'MRR', v: `$${mrr.toLocaleString()}`, i: DollarSign, c: '#34d399' },
          { l: 'ARR (proj.)', v: `$${((mrr * 12) / 1000).toFixed(0)}k`, i: TrendingUp, c: '#38bdf8' },
          { l: 'Rented Assets', v: `${rented.length}`, i: CreditCard, c: '#a78bfa' },
          { l: 'Avg Rent', v: `$${Math.round(mrr / rented.length)}`, i: DollarSign, c: '#fbbf24' },
        ].map((s) => {
          const Icon = s.i;
          return (
            <div key={s.l} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" style={{ color: s.c }} /><p className="text-xs text-slate-500">{s.l}</p></div>
              <p className="text-2xl font-bold text-white font-mono">{s.v}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Recurring Revenue Growth</h3>
        <MrrChart />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-semibold text-sm">Stripe Billing — Property Profitability</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {rented.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30">
              <span className="text-xs text-slate-600 font-mono w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.domain}</p>
                <p className="text-xs text-slate-500 truncate">{p.client}</p>
              </div>
              <span className="text-xs text-slate-500 font-mono hidden sm:block w-20 text-right">{p.monthlyLeads} leads</span>
              <span className="text-sm font-bold text-emerald-400 font-mono w-20 text-right">${p.mrr}</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 w-16 justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
          <span className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Next auto-collection in 6 days</span>
          <span className="text-sm font-bold text-white font-mono">Total: ${mrr.toLocaleString()}/mo</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
