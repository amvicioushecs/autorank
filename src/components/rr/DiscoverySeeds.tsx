import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { addSeeds, listSeeds, removeSeed, runScan, Seed, SeedKind } from '@/lib/discoveryApi';
import { microToUsd } from '@/lib/tregApi';

const SeedColumn: React.FC<{
  kind: SeedKind; label: string; placeholder: string; seeds: Seed[];
  onAdd: (kind: SeedKind, raw: string) => Promise<void>; onRemove: (id: string) => void;
}> = ({ kind, label, placeholder, seeds, onAdd, onRemove }) => {
  const [raw, setRaw] = useState('');
  const submit = async (e: React.FormEvent) => { e.preventDefault(); await onAdd(kind, raw); setRaw(''); };
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label} ({seeds.length})</p>
      <form onSubmit={submit} className="flex gap-2 mb-2">
        <input aria-label={`Add ${kind}`} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={placeholder}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
        <button type="submit" aria-label={`Save ${kind}`} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-slate-300 hover:text-white"><Plus className="w-4 h-4" /></button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {seeds.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-300 rounded-full pl-2.5 pr-1 py-1">
            {s.value}
            <button onClick={() => onRemove(s.id)} aria-label={`Remove ${s.value}`} className="hover:text-rose-400"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
};

const DiscoverySeeds: React.FC<{ onScanned?: () => void }> = ({ onScanned }) => {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(() => listSeeds().then(setSeeds).catch((e) => toast({ title: 'Could not load seeds', description: e.message, variant: 'destructive' })), []);
  useEffect(() => { load(); }, [load]);

  const add = async (kind: SeedKind, raw: string) => {
    try { await addSeeds(kind, raw); await load(); }
    catch (e) { toast({ title: 'Could not add', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }); }
  };
  const remove = async (id: string) => {
    try { await removeSeed(id); setSeeds((prev) => prev.filter((s) => s.id !== id)); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }); }
  };
  const scan = async () => {
    setScanning(true);
    try {
      const r = await runScan();
      toast({ title: 'Batch scan finished', description: r.message ?? `${r.inserted} new opportunities from ${r.scanned} combinations (${microToUsd(r.costMicro)}).` });
      onScanned?.();
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setScanning(false); }
  };

  const niches = seeds.filter((s) => s.kind === 'niche');
  const cities = seeds.filter((s) => s.kind === 'city');
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Batch discovery</h3>
          <p className="text-xs text-slate-500">Every niche × city pair is scored with live volume, CPC and page-one weakness. Separate entries with new lines or semicolons.</p>
        </div>
        <button onClick={scan} disabled={scanning || !niches.length || !cities.length}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Run batch scan
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SeedColumn kind="niche" label="Niches" placeholder="Garage Door Repair; Roofing" seeds={niches} onAdd={add} onRemove={remove} />
        <SeedColumn kind="city" label="Cities" placeholder="Charlotte, NC; Mesa, AZ" seeds={cities} onAdd={add} onRemove={remove} />
      </div>
    </div>
  );
};

export default DiscoverySeeds;
