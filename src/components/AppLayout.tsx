import React, { useState } from 'react';
import Sidebar, { View } from './rr/Sidebar';
import TopBar from './rr/TopBar';
import PropertiesGrid from './rr/PropertiesGrid';
import DiscoveryPanel from './rr/DiscoveryPanel';
import BuilderWizard from './rr/BuilderWizard';
import SEOMonitor from './rr/SEOMonitor';
import LeadManagement from './rr/LeadManagement';
import RevenueAnalytics from './rr/RevenueAnalytics';
import ClientPortal from './rr/ClientPortal';
import AgentActivityLog from './rr/AgentActivityLog';
import PropertyDetail from './rr/PropertyDetail';
import { Property } from '@/data/platformData';
import { X, LayoutGrid, Radar, Hammer, LineChart, Inbox, DollarSign, Users, Activity } from 'lucide-react';

const meta: Record<View, { title: string; sub: string }> = {
  dashboard: { title: 'Factory Dashboard', sub: 'Every site is a product instance managed by autonomous agents' },
  discovery: { title: 'Discovery Agent', sub: 'Find high-intent, low-competition local niches automatically' },
  builder: { title: 'Property Builder', sub: '5-step agentic deployment — niche to live site' },
  seo: { title: 'Live SEO Monitor', sub: 'GSC-connected continuous rank loop with auto-optimization' },
  leads: { title: 'Lead Engine', sub: 'Capture, verify, score & route leads to renters' },
  revenue: { title: 'Revenue Analytics', sub: 'Automated Stripe recurring rent & property profitability' },
  portal: { title: 'Client Portal Builder', sub: 'Branded lead dashboards with restricted client access' },
  activity: { title: 'Agent Activity Log', sub: 'All autonomous actions with manual override controls' },
};

const mobileNav: { id: View; icon: React.ElementType }[] = [
  { id: 'dashboard', icon: LayoutGrid },
  { id: 'discovery', icon: Radar },
  { id: 'builder', icon: Hammer },
  { id: 'seo', icon: LineChart },
  { id: 'leads', icon: Inbox },
  { id: 'revenue', icon: DollarSign },
  { id: 'portal', icon: Users },
  { id: 'activity', icon: Activity },
];

const AppLayout: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<Property | null>(null);

  const go = (v: View) => {
    setView(v);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-200 font-sans overflow-hidden">
      <Sidebar active={view} onChange={go} open />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-64 bg-[#0a0e1a] border-r border-slate-800 p-3">
            <div className="flex justify-end mb-2"><button onClick={() => setMobileOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            {mobileNav.map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.id} onClick={() => go(n.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 ${view === n.id ? 'bg-sky-500/20 text-white' : 'text-slate-400'}`}>
                  <Icon className="w-4 h-4" /> {meta[n.id].title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={meta[view].title} subtitle={meta[view].sub} onToggle={() => setMobileOpen(true)} onNewProperty={() => setView('builder')} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {view === 'dashboard' && <PropertiesGrid onSelect={setSelected} />}
          {view === 'discovery' && <DiscoveryPanel />}
          {view === 'builder' && <BuilderWizard />}
          {view === 'seo' && <SEOMonitor />}
          {view === 'leads' && <LeadManagement />}
          {view === 'revenue' && <RevenueAnalytics />}
          {view === 'portal' && <ClientPortal />}
          {view === 'activity' && <AgentActivityLog />}
          <footer className="mt-10 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-600">RankForge · Autonomous Rank &amp; Rent Factory · Supabase + Next.js + Vercel · Stripe · Twilio · GSC</p>
          </footer>
        </main>
      </div>

      <PropertyDetail p={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default AppLayout;
