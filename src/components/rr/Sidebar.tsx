import React from 'react';
import { LayoutGrid, Radar, Hammer, LineChart, Inbox, DollarSign, Users, Activity, Boxes } from 'lucide-react';

export type View = 'dashboard' | 'discovery' | 'builder' | 'seo' | 'leads' | 'revenue' | 'portal' | 'activity';

const items: { id: View; label: string; icon: React.ElementType; agent?: string }[] = [
  { id: 'dashboard', label: 'Factory', icon: LayoutGrid },
  { id: 'discovery', label: 'Discovery', icon: Radar, agent: 'Agent' },
  { id: 'builder', label: 'Property Builder', icon: Hammer, agent: 'Agent' },
  { id: 'seo', label: 'SEO Monitor', icon: LineChart, agent: 'Agent' },
  { id: 'leads', label: 'Lead Engine', icon: Inbox, agent: 'Agent' },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'portal', label: 'Client Portal', icon: Users },
  { id: 'activity', label: 'Agent Log', icon: Activity },
];

interface Props {
  active: View;
  onChange: (v: View) => void;
  open: boolean;
}

const Sidebar: React.FC<Props> = ({ active, onChange, open }) => {
  return (
    <aside
      className={`${open ? 'w-60' : 'w-0 lg:w-60'} transition-all duration-300 shrink-0 overflow-hidden border-r border-slate-800 bg-[#0a0e1a] hidden lg:flex flex-col`}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Boxes className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-tight">RankForge</p>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Autonomous Factory</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/20 to-emerald-500/10 text-white border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1 text-left">{it.label}</span>
              {it.agent && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">AI</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-xs text-emerald-400 font-mono">5 AGENTS ONLINE</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">Closed-loop automation running. Last sync 12s ago.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
