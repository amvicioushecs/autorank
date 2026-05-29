import React, { useState } from 'react';
import { agentEvents } from '@/data/platformData';
import { Radar, Hammer, LineChart, Send, DollarSign, Activity, Pause, Play, Check, Loader2, Info } from 'lucide-react';

const agentMeta: Record<string, { icon: React.ElementType; color: string }> = {
  Discovery: { icon: Radar, color: '#38bdf8' },
  Architect: { icon: Hammer, color: '#fbbf24' },
  'SEO Optimizer': { icon: LineChart, color: '#a78bfa' },
  Outreach: { icon: Send, color: '#f472b6' },
  Monetization: { icon: DollarSign, color: '#34d399' },
};

const resultMeta: Record<string, { icon: React.ElementType; color: string }> = {
  success: { icon: Check, color: '#34d399' },
  pending: { icon: Loader2, color: '#fbbf24' },
  info: { icon: Info, color: '#38bdf8' },
};

const AgentActivityLog: React.FC = () => {
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const agents = Object.keys(agentMeta);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {agents.map((a) => {
          const m = agentMeta[a];
          const Icon = m.icon;
          const isPaused = paused[a];
          return (
            <div key={a} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}1a` }}>
                  <Icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <button onClick={() => setPaused((p) => ({ ...p, [a]: !p[a] }))} className="text-slate-500 hover:text-white">
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs font-medium text-white mt-2 leading-tight">{a}</p>
              <p className={`text-[10px] font-mono mt-0.5 ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>{isPaused ? 'PAUSED' : 'RUNNING'}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-semibold text-sm">Autonomous Action Log</h3>
          <span className="ml-auto text-xs text-emerald-400 font-mono flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE FEED</span>
        </div>
        <div className="relative">
          <div className="absolute left-[34px] top-0 bottom-0 w-px bg-slate-800" />
          {agentEvents.map((e) => {
            const m = agentMeta[e.agent];
            const Icon = m.icon;
            const r = resultMeta[e.result];
            const RIcon = r.icon;
            return (
              <div key={e.id} className="flex gap-4 px-5 py-3.5 hover:bg-slate-800/30 relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-[#0a0e1a]" style={{ background: `${m.color}26` }}>
                  <Icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: m.color }}>{e.agent}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{e.time}</span>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: r.color }}>
                      <RIcon className={`w-3 h-3 ${e.result === 'pending' ? 'animate-spin' : ''}`} /> {e.result}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-0.5">{e.action}</p>
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">{e.property}</p>
                </div>
                <button className="text-[10px] text-slate-500 hover:text-white border border-slate-700 rounded px-2 py-1 h-fit shrink-0">Override</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentActivityLog;
