import React, { useState, useEffect, useRef } from 'react';
import { Check, Hammer, Globe, FileText, Search, Rocket, Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRRData } from '@/contexts/RRDataContext';
import { deploySite } from '@/lib/sitesApi';

const steps = [
  { id: 0, label: 'Niche Selection', icon: Sparkles, agent: 'Discovery validates demand & seed keywords' },
  { id: 1, label: 'Domain Config', icon: Globe, agent: 'Architect maps DNS, provisions SSL' },
  { id: 2, label: 'Content Generation', icon: FileText, agent: 'RAG-grounded localized pages generated' },
  { id: 3, label: 'SEO Optimization', icon: Search, agent: 'Schema, internal links & meta auto-built' },
  { id: 4, label: 'Deployment', icon: Rocket, agent: 'Pushed live via Vercel edge' },
];

const BuilderWizard: React.FC<{ onDeployed?: () => void }> = ({ onDeployed }) => {
  const { createProperty } = useRRData();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState('Garage Door Repair');
  const [city, setCity] = useState('Charlotte, NC');
  const [domain, setDomain] = useState('charlottegaragedoorpro.com');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const onDeployedRef = useRef(onDeployed);
  onDeployedRef.current = onDeployed;

  useEffect(() => {
    if (!running) return;
    if (progress >= 100) {
      setProgress(0);
      if (step < 4) {
        setRunning(false);
        setStep((s) => s + 1);
      } else {
        // final deploy: persist to database exactly once
        setRunning(false);
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        (async () => {
          try {
            const created = await createProperty({ domain, niche, city, status: 'building', health: 42, keywords: 14 });
            try {
              const r = await deploySite(created.id);
              toast({ title: 'Site deployed', description: `${r.url} is live. Point ${domain} DNS at Vercel to go live on the domain.` });
            } catch (deployErr) {
              toast({ title: 'Property saved, site not deployed', description: deployErr instanceof Error ? deployErr.message : String(deployErr), variant: 'destructive' });
            }
            setDone(true);
            onDeployedRef.current?.();
          } catch (e) {
            toast({ title: 'Deploy failed', description: e instanceof Error ? e.message : 'Could not save property to database.', variant: 'destructive' });
          } finally {
            savingRef.current = false;
            setSaving(false);
          }
        })();
      }
      return;
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + 8)), 90);
    return () => clearTimeout(t);
  }, [running, progress, step, domain, niche, city, createProperty]);

  const advance = () => {
    if (running || savingRef.current) return;
    if (step === 0 && (!niche || !city)) {
      toast({ title: 'Fill in niche & city', variant: 'destructive' });
      return;
    }
    if (step === 1 && !domain) {
      toast({ title: 'Enter a domain', variant: 'destructive' });
      return;
    }
    setRunning(true);
  };

  const reset = () => {
    setStep(0); setDone(false); setProgress(0);
    setNiche('Tree Removal'); setCity('Sacramento, CA'); setDomain('sacramentotreeremoval.com');
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-white font-bold text-lg">Property Deployed</h2>
        <p className="text-sm text-slate-400 mt-1">{domain} is now persisted and live in your factory.</p>
        <button onClick={reset} className="mt-6 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg">Build Another</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < step;
          const active = i === step;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone ? 'bg-emerald-500 border-emerald-500' : active ? 'bg-sky-500/20 border-sky-500' : 'bg-slate-800 border-slate-700'
                }`}>
                  {isDone ? <Check className="w-5 h-5 text-slate-900" /> : <Icon className={`w-5 h-5 ${active ? 'text-sky-400' : 'text-slate-600'}`} />}
                </div>
                <span className={`text-[10px] text-center hidden sm:block ${active ? 'text-white font-medium' : 'text-slate-500'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 -mt-5 ${isDone ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Hammer className="w-5 h-5 text-sky-400" />
          <h2 className="text-white font-bold">{steps[step].label}</h2>
        </div>
        <p className="text-xs text-emerald-400 font-mono mb-5">⚙ {steps[step].agent}</p>

        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Target Niche</label>
              <input value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Target City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Exact-Match Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-sky-500" />
            <p className="text-xs text-slate-500 mt-2">Architect Agent will map DNS records and provision SSL automatically.</p>
          </div>
        )}
        {step >= 2 && (
          <div className="space-y-2">
            {['Homepage + service overview', `City landing pages for ${city.split(',')[0]} metro`, 'FAQ + schema markup (LocalBusiness)', 'Internal link graph', 'Lead capture form + AI chat widget'].map((x, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2">
                <Check className="w-4 h-4 text-emerald-400" /> {x}
              </div>
            ))}
          </div>
        )}

        {running && (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm text-sky-400 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Agent working... {progress}%
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          {step < 4 ? (
            <button onClick={advance} disabled={running || saving} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-60">
              {running ? 'Processing...' : 'Run Agent & Continue'} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={advance} disabled={running || saving} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-60">
              <Rocket className="w-4 h-4" /> {running || saving ? 'Deploying...' : 'Deploy Property'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuilderWizard;
