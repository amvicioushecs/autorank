import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Radar, Hammer, LineChart, Inbox, DollarSign, Users, ShieldCheck, Lock, ArrowRight, Database, Zap, Globe } from 'lucide-react';

const HERO = 'https://d64gsuwffb70l.cloudfront.net/6a19aa7e9b69056178b8830a_1791333269020_b24ba59f.jpg';

const agents = [
  { icon: Radar, name: 'Discovery Agent', desc: 'Live Google keyword volume, CPC & competition via treg to surface winnable local niches.', color: 'text-sky-400 bg-sky-500/10' },
  { icon: Hammer, name: 'Architect Agent', desc: '5-step deployment — domain, localized content, schema and city pages.', color: 'text-violet-400 bg-violet-500/10' },
  { icon: LineChart, name: 'SEO Optimizer', desc: 'Live SERP checks against top competitors trigger content refresh loops.', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: Inbox, name: 'Lead Engine', desc: 'Verify, score and route leads by SMS, email or CRM webhook.', color: 'text-amber-400 bg-amber-500/10' },
  { icon: DollarSign, name: 'Monetization Layer', desc: 'Recurring rent tracking and per-property profitability.', color: 'text-rose-400 bg-rose-500/10' },
  { icon: Users, name: 'Client Portal', desc: 'Restricted renter views with lead metrics & billing status.', color: 'text-cyan-400 bg-cyan-500/10' },
];

const pillars = [
  { icon: Lock, title: 'Owner-scoped data', desc: 'Every property, opportunity and lead carries your user_id. Row Level Security blocks everyone else.' },
  { icon: Database, title: 'Starter portfolio', desc: 'Your first sign-in clones a 14-asset demo portfolio into your private workspace.' },
  { icon: Zap, title: 'Metered live data', desc: 'Market and SERP calls are tagged to your account and logged with their exact cost.' },
];

const AuthGate: React.FC = () => {
  const { openAuth } = useAuth();
  return (
    <div className="max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800">
        <img src={HERO} alt="Autonomous rank and rent factory" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/85 to-transparent" />
        <div className="relative p-8 sm:p-12 lg:p-16 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> PRIVATE OPERATOR WORKSPACE
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Your digital real estate, <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">run by agents.</span>
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            RankForge is a Business-in-a-Box for Rank &amp; Rent. Sign in to open your factory dashboard: discover niches with live market data, deploy sites, track rankings and lease leads to local businesses.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => openAuth('signup')} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold px-5 py-3 rounded-lg hover:shadow-lg hover:shadow-sky-500/30 transition-all">
              Create your factory <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => openAuth('signin')} className="flex items-center gap-2 border border-slate-700 bg-slate-900/60 text-white font-semibold px-5 py-3 rounded-lg hover:border-sky-500 transition-all">
              <Lock className="w-4 h-4" /> Sign in
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid sm:grid-cols-3 gap-4">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p.icon className="w-5 h-5 text-sky-400" />
            <h3 className="mt-3 text-white font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-bold">The agents waiting behind the gate</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <button key={a.name} onClick={() => openAuth('signin')} className="text-left rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-600 transition-all group relative">
              <Lock className="w-3.5 h-3.5 text-slate-600 absolute top-4 right-4 group-hover:text-sky-400" />
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color}`}><a.icon className="w-5 h-5" /></div>
              <h4 className="mt-3 text-white font-semibold">{a.name}</h4>
              <p className="mt-1 text-sm text-slate-400">{a.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AuthGate;
