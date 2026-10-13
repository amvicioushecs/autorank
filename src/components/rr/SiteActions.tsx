import React, { useState } from 'react';
import { Loader2, Rocket, ExternalLink, Phone } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Property } from '@/data/platformData';
import { deploySite } from '@/lib/sitesApi';
import { updatePropertyContact } from '@/lib/rrApi';

const SiteActions: React.FC<{ p: Property; onChanged?: () => void }> = ({ p, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(p.phone ?? '');
  const [fwdEmail, setFwdEmail] = useState(p.forwardEmail ?? '');
  const [fwdPhone, setFwdPhone] = useState(p.forwardPhone ?? '');

  const savePhone = async () => {
    if (fwdEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fwdEmail.trim())) {
      toast({ title: 'Enter a valid forwarding email', variant: 'destructive' });
      return;
    }
    try {
      await updatePropertyContact(p.id, { phone: phone.trim() || null, forwardEmail: fwdEmail.trim() || null, forwardPhone: fwdPhone.trim() || null });
      toast({ title: 'Contact & lead routing saved' });
      onChanged?.();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }); }
  };

  const deploy = async () => {
    setBusy(true);
    try {
      const r = await deploySite(p.id);
      toast({ title: 'Site deployed', description: r.domainNote ? `${r.url} — ${r.domainNote}` : `${r.url} (${r.files} files). Point ${p.domain} DNS at Vercel.` });
      onChanged?.();
    } catch (e) {
      toast({ title: 'Deploy failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-300">Website</p>
      <div className="flex gap-2">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 flex-1">
          <Phone className="w-3.5 h-3.5 text-slate-500" />
          <input aria-label="Tracking phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tracking phone (optional)" className="bg-transparent text-sm text-white outline-none w-full py-2" />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Lead routing: form leads are emailed and calls forwarded here.</p>
      <input aria-label="Forward leads to email" value={fwdEmail} onChange={(e) => setFwdEmail(e.target.value)} placeholder="Forward leads to email" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white outline-none" />
      <input aria-label="Forward calls to phone" value={fwdPhone} onChange={(e) => setFwdPhone(e.target.value)} placeholder="Forward calls to phone (+1...)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white outline-none" />
      <button onClick={savePhone} className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg py-2 text-slate-300 hover:text-white">Save contact &amp; routing</button>
      {p.siteUrl && (
        <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> {p.siteUrl}
        </a>
      )}
      {p.deployError && <p className="text-[11px] text-amber-400">{p.deployError}</p>}
      <button onClick={deploy} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm py-2 rounded-lg disabled:opacity-60">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} {p.siteUrl ? 'Redeploy site' : 'Build & deploy site'}
      </button>
    </div>
  );
};

export default SiteActions;
