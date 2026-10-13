import React, { useState } from 'react';
import { rankHistory, seoKeywords } from '@/data/platformData';
import { LineChart, ArrowUp, ArrowDown, Minus, RefreshCw, Zap, Globe } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import LiveSerpCheck from './LiveSerpCheck';
import RankAlerts from './RankAlerts';

const RankChart: React.FC = () => {
  const w = 560, h = 200, pad = 28;
  const data = rankHistory;
  const max = 16, min = 0;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + ((v - min) / (max - min)) * (h - pad * 2); // lower position = higher on chart
  const line = data.map((d, i) => `${x(i)},${y(d.position)}`).join(' L ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 5, 10, 15].map((g) => (
        <g key={g}>
          <line x1={pad} y1={y(g)} x2={w - pad} y2={y(g)} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <text x={4} y={y(g) + 3} fill="#475569" fontSize="9" fontFamily="monospace">#{g}</text>
        </g>
      ))}
      <path d={`M ${line} L ${x(data.length - 1)},${h - pad} L ${x(0)},${h - pad} Z`} fill="url(#rg)" />
      <path d={`M ${line}`} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.position)} r="3.5" fill="#0a0e1a" stroke="#38bdf8" strokeWidth="2" />
          <text x={x(i)} y={h - 8} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">{d.week}</text>
        </g>
      ))}
    </svg>
  );
};

const SEOMonitor: React.FC = () => {
  const [optimizing, setOptimizing] = useState(false);
  const triggerOptimize = () => {
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      toast({ title: 'SEO Optimizer ran', description: 'Re-analyzed top 3 competitors, regenerated headers & refreshed 6 clusters.' });
    }, 1600);
  };

  return (
    <div className="space-y-5">
      <RankAlerts />
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3">
        <Globe className="w-5 h-5 text-sky-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">austinemergencyplumber.com</p>
          <p className="text-xs text-slate-500">GSC connected · Last crawl 3h ago · 28 keywords tracked</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE</span>
      </div>

      <LiveSerpCheck />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-sky-400" />
              <h3 className="text-white font-semibold text-sm">Average SERP Position — 8 Weeks</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> #14 → #2</span>
          </div>
          <RankChart />
        </div>

        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-violet-950/30 to-sky-950/20 p-5 flex flex-col">
          <Zap className="w-6 h-6 text-violet-400 mb-2" />
          <h3 className="text-white font-semibold">Auto-Optimization</h3>
          <p className="text-xs text-slate-400 mt-1 flex-1">SEO Optimizer detected movement on 3 clusters. Trigger a content refresh loop: re-analyze competitors, regenerate semantic entities, update pages.</p>
          <div className="grid grid-cols-2 gap-2 my-3">
            <div className="bg-slate-800/40 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white font-mono">6</p><p className="text-[10px] text-slate-500">Clusters flagged</p></div>
            <div className="bg-slate-800/40 rounded-lg p-2 text-center"><p className="text-lg font-bold text-emerald-400 font-mono">92%</p><p className="text-[10px] text-slate-500">Auto-fix rate</p></div>
          </div>
          <button onClick={triggerOptimize} disabled={optimizing} className="flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60 transition-colors">
            <RefreshCw className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} /> {optimizing ? 'Optimizing...' : 'Trigger Refresh Loop'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Keyword Position Tracking</h3>
          <span className="text-xs text-slate-500 font-mono">{seoKeywords.length} of 28 shown</span>
        </div>
        <div className="divide-y divide-slate-800">
          {seoKeywords.map((k) => (
            <div key={k.term} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30">
              <span className="text-sm text-slate-200 flex-1 truncate">{k.term}</span>
              <span className="text-xs text-slate-500 font-mono w-16 text-right hidden sm:block">{k.vol.toLocaleString()}/mo</span>
              <span className="text-sm font-bold text-white font-mono w-10 text-right">#{k.pos}</span>
              <span className={`text-xs font-mono w-12 text-right flex items-center justify-end gap-0.5 ${k.change < 0 ? 'text-emerald-400' : k.change > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {k.change < 0 ? <ArrowUp className="w-3 h-3" /> : k.change > 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {k.change !== 0 ? Math.abs(k.change) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SEOMonitor;
