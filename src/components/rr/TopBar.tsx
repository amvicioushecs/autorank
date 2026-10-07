import React, { useState } from 'react';
import { Menu, Search, Plus, Bell, LogIn, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  title: string;
  subtitle: string;
  onToggle: () => void;
  onNewProperty: () => void;
}

const TopBar: React.FC<Props> = ({ title, subtitle, onToggle, onNewProperty }) => {
  const { user, openAuth, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = (user?.user_metadata?.full_name as string) || user?.email || '';
  const initials = name ? name.split(/[\s@.]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') : 'OP';

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
      {user && (
        <>
          <div className="hidden md:flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 w-56">
            <Search className="w-4 h-4 text-slate-500" />
            <input placeholder="Search properties..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none w-full" />
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
        </>
      )}

      {user ? (
        <div className="relative pl-2 border-l border-slate-800">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 z-40 rounded-xl border border-slate-800 bg-[#0d1220] shadow-2xl p-2">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-sm text-white font-medium truncate">{name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400"><ShieldCheck className="w-3 h-3" /> RLS-scoped operator</p>
                </div>
                <button
                  onClick={async () => { setMenuOpen(false); await signOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => openAuth('signin')}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-sky-500/25 transition-all"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
      )}
    </header>
  );
};

export default TopBar;
