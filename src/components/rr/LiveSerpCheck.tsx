import React, { useEffect, useMemo, useState } from 'react';
import { useRRData } from '@/contexts/RRDataContext';
import { fetchSerp, fetchTregUsage, microToUsd, SerpResult, UsageRow } from '@/lib/tregApi';
import { Search, Loader2, ExternalLink, Crown, AlertCircle, Receipt, Zap } from 'lucide-react';

const LiveSerpCheck: React.FC = () => {
  const { properties } = useRRData();
  const [propId, setPropId] = useState<string>('');
  const prop = useMemo(() => properties.find((p) => p.id === propId) || properties[0], [properties, propId]);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SerpResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);

  const loadUsage = () => fetchTregUsage(25).then(setUsage).catch(() => {});
  useEffect(() => { loadUsage(); }, []);

  const seedKeyword = prop ? `${prop.niche} ${prop.city.split(',')[0]}`.toLowerCase() : null;
  useEffect(() => {
    if (seedKeyword) setKeyword(seedKeyword);
  }, [seedKeyword]);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetchSerp(keyword.trim(), 10);
      setResults(res.results);
      if (res.results.length === 0) setError('No organic results returned for that keyword.');
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "") || 'SERP check failed');
    } finally {
      setLoading(false);
      loadUsage();
    }
  };

  const ownDomain = prop?.domain.replace(/^www\./, '').toLowerCase();
  const ownRank = results.find((r) => r.domain.toLowerCase() === ownDomain)?.position;
  const totalSpend = usage.reduce((s, u) => s + u.costMicro, 0);

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-xl border border-sky-500/20 bg-slate-900/70 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-semibold text-sm">Live SERP Competitor Check</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">TREG</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">Pull the real top-10 Google results to see who you must out-rank before the Optimizer refreshes content.</p>
        <form onSubmit={run} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
          <select value={prop?.id || ''} onChange={(e) => setPropId(e.target.value)} className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500">
            {properties.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Keyword" className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
          <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Check SERP
          </button>
        </form>

        {error && <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        {results.length > 0 && (
          <>
            <div className={`mt-4 text-xs rounded-lg p-2.5 border ${ownRank ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700'}`}>
              {ownRank ? `${ownDomain} ranks #${ownRank} for this keyword.` : `${ownDomain} is not in the top ${results.length} — the Optimizer should target the competitors below.`}
            </div>
            <ol className="mt-3 divide-y divide-slate-800">
              {results.map((r) => {
                const mine = r.domain.toLowerCase() === ownDomain;
                return (
                  <li key={`${r.position}-${r.link}`} className={`py-3 flex gap-3 ${mine ? 'bg-emerald-500/5' : ''}`}>
                    <span className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold font-mono ${r.position <= 3 ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                      {r.position === 1 ? <Crown className="w-3.5 h-3.5" /> : r.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-300 hover:underline line-clamp-1 inline-flex items-center gap-1">{r.title} <ExternalLink className="w-3 h-3 shrink-0" /></a>
                      <p className="text-[11px] text-emerald-400/80 font-mono truncate">{r.domain}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{r.snippet}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-violet-400" />
          <h3 className="text-white font-semibold text-sm">Live Data Ledger</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-800/40 rounded-lg p-2 text-center"><p className="text-lg font-bold text-white font-mono">{usage.length}</p><p className="text-[10px] text-slate-500">Recent calls</p></div>
          <div className="bg-slate-800/40 rounded-lg p-2 text-center"><p className="text-lg font-bold text-emerald-400 font-mono">{microToUsd(totalSpend)}</p><p className="text-[10px] text-slate-500">Spend</p></div>
        </div>
        <div className="flex-1 space-y-1.5 max-h-72 overflow-y-auto">
          {usage.length === 0 && <p className="text-xs text-slate-600">No metered calls yet. Run a market scan or SERP check.</p>}
          {usage.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-[11px] font-mono bg-slate-800/30 rounded px-2 py-1.5">
              <span className="text-slate-400 truncate">{u.endpoint.replace('treg.google.', '')}</span>
              <span className={u.status && u.status >= 400 ? 'text-rose-400' : 'text-slate-300'}>{microToUsd(u.costMicro)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Each call is tagged with your operator ID so spend is attributable per account.</p>
      </div>
    </div>
  );
};

export default LiveSerpCheck;
