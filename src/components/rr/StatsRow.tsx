import React from 'react';
import { TrendingUp, TrendingDown, Building2, DollarSign, Inbox, Trophy } from 'lucide-react';
import { useRRData } from '@/contexts/RRDataContext';

const StatCard: React.FC<{ label: string; value: string; sub: string; up: boolean; icon: React.ElementType; accent: string }> = ({ label, value, sub, up, icon: Icon, accent }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-4 sm:p-5 group hover:border-slate-700 transition-all">
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: accent }} />
    <div className="flex items-start justify-between relative">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">{value}</p>
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}1a`, color: accent }}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="flex items-center gap-1.5 mt-3 relative">
      {up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
      <span className={`text-xs font-mono ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{sub}</span>
    </div>
  </div>
);

const StatsRow: React.FC = () => {
  const { properties } = useRRData();
  const rented = properties.filter((p) => p.client).length;
  const mrr = properties.reduce((s, p) => s + p.mrr, 0);
  const leads = properties.reduce((s, p) => s + p.monthlyLeads, 0);
  const avgTop3 = properties.filter((p) => p.rankPosition <= 3).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard label="Active Assets" value={`${properties.length}`} sub={`${rented} rented`} up icon={Building2} accent="#38bdf8" />
      <StatCard label="Monthly Revenue" value={`$${(mrr / 1000).toFixed(1)}k`} sub="+21.6% MoM" up icon={DollarSign} accent="#34d399" />
      <StatCard label="Leads / Month" value={`${leads}`} sub="+18% vs last mo" up icon={Inbox} accent="#a78bfa" />
      <StatCard label="Top 3 Rankings" value={`${avgTop3}`} sub="+4 this week" up icon={Trophy} accent="#fbbf24" />
    </div>
  );
};

export default StatsRow;
