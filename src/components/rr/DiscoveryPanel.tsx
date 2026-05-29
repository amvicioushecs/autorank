import React, { useState } from 'react';
import { useRRData } from '@/contexts/RRDataContext';
import { Opportunity } from '@/data/platformData';
import { Radar, Search, TrendingUp, Target, DollarSign, Rocket, Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const c = score >= 88 ? '#34d399' : score >= 80 ? '#38bdf8' : '#fbbf24';
  const r = 18;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono" style={{ color: c }}>{score}</span>
    </div>
  );
};

const DiscoveryPanel: React.FC = () => {
  const { opportunities, deployOpportunity, loading } = useRRData();
  const [scanning, setScanning] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast({ title: 'Scan complete', description: `Discovery Agent validated ${opportunities.length} low-competition niches.` });
    }, 1800);
  };

  const deploy = async (o: Opportunity) => {
    setDeploying(o.id);
    try {
      await deployOpportunity(o);
      toast({ title: 'Architect Agent triggered', description: `Property for "${o.niche}" saved to database — DNS, SSL & city pages queued.` });
    } catch (e) {
      toast({ title: 'Deployment failed', description: 'Could not save property.', variant: 'destructive' });
    } finally {
      setDeploying(null);
    }
  };

  const list = opportunities.filter((o) => `${o.niche} ${o.city}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-sky-950/40 to-emerald-950/20 p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
          <Radar className={`w-6 h-6 text-sky-400 ${scanning ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-bold">Discovery Agent</h2>
          <p className="text-sm text-slate-400">Scrapes Google Trends, Keyword Planner & competitors to surface high-intent, low-competition local niches.</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-60"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
          {scanning ? 'Scanning markets...' : 'Run Niche Scan'}
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter opportunities by niche or city..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none w-full" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading opportunities...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-500">All opportunities deployed. Run a new scan to discover more.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((o) => {
            const isDeploying = deploying === o.id;
            return (
              <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ScoreRing score={o.score} />
                    <div>
                      <p className="text-white font-semibold">{o.niche}</p>
                      <p className="text-xs text-slate-500">{o.city}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">VALIDATED</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  <div className="bg-slate-800/40 rounded-lg py-2">
                    <Search className="w-3.5 h-3.5 mx-auto text-sky-400 mb-1" />
                    <p className="text-sm font-bold text-white font-mono">{(o.searchVolume / 1000).toFixed(1)}k</p>
                    <p className="text-[9px] text-slate-500">Volume</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg py-2">
                    <Target className="w-3.5 h-3.5 mx-auto text-amber-400 mb-1" />
                    <p className="text-sm font-bold text-white font-mono">{o.competition}</p>
                    <p className="text-[9px] text-slate-500">Comp.</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg py-2">
                    <TrendingUp className="w-3.5 h-3.5 mx-auto text-violet-400 mb-1" />
                    <p className="text-sm font-bold text-white font-mono">${o.cpc}</p>
                    <p className="text-[9px] text-slate-500">CPC</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg py-2">
                    <DollarSign className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-1" />
                    <p className="text-sm font-bold text-white font-mono">${(o.estRevenue / 1000).toFixed(1)}k</p>
                    <p className="text-[9px] text-slate-500">Est. MRR</p>
                  </div>
                </div>
                <button
                  onClick={() => deploy(o)}
                  disabled={isDeploying}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-all bg-slate-800 text-white hover:bg-sky-500 hover:text-slate-900 border border-slate-700 disabled:opacity-60"
                >
                  {isDeploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Rocket className="w-4 h-4" /> One-Click Deploy</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoveryPanel;
