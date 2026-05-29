import React from 'react';
import { Menu, Search, Plus, Bell, Zap } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  onToggle: () => void;
  onNewProperty: () => void;
}

const TopBar: React.FC<Props> = ({ title, subtitle, onToggle, onNewProperty }) => {
  return (
    <header className="h-16 shrink-0 border-b border-slate-800 bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4 px-4 sm:px-6">
      <button onClick={onToggle} className="lg:hidden text-slate-400 hover:text-white">
        <Menu className="w-5 h-5" />
      </button>
      <div className="min-w-0">
        <h1 className="text-white font-bold text-base sm:text-lg leading-tight truncate">{title}</h1>
        <p className="text-[11px] text-slate-500 hidden sm:block truncate">{subtitle}</p>
      </div>
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 w-56">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          placeholder="Search properties..."
          className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none w-full"
        />
      </div>
      <button className="relative text-slate-400 hover:text-white p-2">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full" />
      </button>
      <button
        onClick={onNewProperty}
        className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-3.5 py-2 rounded-lg hover:shadow-lg hover:shadow-sky-500/25 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Asset</span>
      </button>
      <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">OP</div>
      </div>
    </header>
  );
};

export default TopBar;
