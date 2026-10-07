import React, { useState } from 'react';
import { fetchKeywordMetrics, scoreOpportunity, microToUsd, KeywordMetric } from '@/lib/tregApi';
import { useRRData } from '@/contexts/RRDataContext';
import Sparkline from './Sparkline';
import { Radar, Loader2, Plus, Check, Zap, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PRESET_NICHES = ['emergency plumber', 'roof repair', 'tree removal', 'garage door repair', 'water damage restoration', 'hvac repair'];

interface Row extends KeywordMetric { city: string; score: number; estRevenue: number }

const LiveMarketScan: React.FC = () => {
  const { createOpportunity } = useRRData();
  const [niche, setNiche] = useState('emergency plumber');
  const [cities, setCities] = useState('Austin, Denver, Tampa, Boise');
  const [rows, setRows] = useState<Row[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ cost: number; servedBy: string | null } | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const scan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cityList = cities.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 10);
    if (!niche.trim() || cityList.length === 0) return setError('Enter a niche and at least one city.');
    setError(null); setScanning(true); setRows([]); setSaved(new Set());
    try {
      const keywords = cityList.map((c) => `${niche.trim().toLowerCase()} ${c.toLowerCase()}`);
      const res = await fetchKeywordMetrics(keywords);
      const mapped: Row[] = res.rows.map((r) => {
        const city = cityList.find((c) => r.keyword.endsWith(c.toLowerCase())) || '';
        return { ...r, city, ...scoreOpportunity(r) };
      }).sort((a, b) => b.score - a.score);
      setRows(mapped);
      setMeta({ cost: res.costMicro, servedBy: res.servedBy });
      if (mapped.length === 0) setError('No volume data returned for those keywords — try a broader niche or bigger cities.');
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const save = async (r: Row) => {
    try {
      await createOpportunity({
        niche: niche.replace(/\b\w/g, (c) => c.toUpperCase()),
        city: r.city || r.keyword,
        searchVolume: r.searchVolume,
        competition: Math.round(r.competitionIndex),
        cpc: Math.round(r.cpc * 100) / 100,
        estRevenue: r.estRevenue,
        score: r.score,
      });
      setSaved((s) => new Set(s).add(r.keyword));
      toast({ title: 'Opportunity saved', description: `"${r.keyword}" added to your private pipeline.` });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-xl border border-sky-500/20 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-sky-400" />
        <h3 className="text-white font-semibold text-sm">Live Market Scan</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">POWERED BY TREG</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Real Google search volume, CPC & competition for "niche + city" keywords. Each scan is metered to your account.</p>

      <form onSubmit={scan} className="grid md:grid-cols-[1fr_1.4fr_auto] gap-2">
        <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Niche (e.g. roof repair)" className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Cities, comma separated (max 10)" className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <button type="submit" disabled={scanning} className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-60">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />} {scanning ? 'Scanning...' : 'Scan Market'}
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {PRESET_NICHES.map((n) => (
          <button key={n} type="button" onClick={() => setNiche(n)} className={`text-[11px] px-2 py-1 rounded-full border ${niche === n ? 'border-sky-500 text-sky-300 bg-sky-500/10' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{n}</button>
        ))}
      </div>

      {error && <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 font-medium">Keyword</th>
                <th className="text-right py-2 font-medium">Volume</th>
                <th className="text-right py-2 font-medium">CPC</th>
                <th className="text-right py-2 font-medium">Comp.</th>
                <th className="py-2 font-medium hidden md:table-cell">12-mo trend</th>
                <th className="text-right py-2 font-medium">Score</th>
                <th className="text-right py-2 font-medium">Est. MRR</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <tr key={r.keyword} className="hover:bg-slate-800/30">
                  <td className="py-2.5 text-slate-200">{r.keyword}</td>
                  <td className="py-2.5 text-right font-mono text-white">{r.searchVolume.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono text-violet-300">${r.cpc.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-mono text-amber-300">{r.competitionIndex}</td>
                  <td className="py-2.5 px-3 hidden md:table-cell">{r.monthly.length > 1 && <Sparkline data={r.monthly} color="#38bdf8" width={88} height={22} />}</td>
                  <td className={`py-2.5 text-right font-mono font-bold ${r.score >= 80 ? 'text-emerald-400' : r.score >= 65 ? 'text-sky-400' : 'text-slate-400'}`}>{r.score}</td>
                  <td className="py-2.5 text-right font-mono text-emerald-300">${r.estRevenue.toLocaleString()}</td>
                  <td className="py-2.5 text-right pl-2">
                    <button onClick={() => save(r)} disabled={saved.has(r.keyword)} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:border-sky-500 hover:text-white disabled:border-emerald-500/30 disabled:text-emerald-400">
                      {saved.has(r.keyword) ? <><Check className="w-3 h-3" /> Saved</> : <><Plus className="w-3 h-3" /> Save</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && <p className="mt-2 text-[10px] font-mono text-slate-600">served by {meta.servedBy || 'treg'} · cost {microToUsd(meta.cost)}</p>}
        </div>
      )}
    </div>
  );
};

export default LiveMarketScan;
