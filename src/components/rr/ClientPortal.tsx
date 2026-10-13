import React, { useState, useEffect } from 'react';
import { useRRData } from '@/contexts/RRDataContext';
import { Property } from '@/data/platformData';
import { Users, Link2, Copy, Check, Mail, Eye, Inbox, DollarSign, TrendingUp, Loader2, FileSignature, ShieldOff } from 'lucide-react';
import { createPortalToken, revokePortalTokens, portalUrl, inviteMailto } from '@/lib/portalApi';
import { createCheckoutLink } from '@/lib/billingApi';
import { toast } from '@/components/ui/use-toast';

const ClientPortal: React.FC = () => {
  const { properties, assignClient } = useRRData();
  const [selectedId, setSelectedId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [rent, setRent] = useState('1500');
  const [copied, setCopied] = useState(false);
  const [leasing, setLeasing] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (!selectedId && properties.length) {
      const firstRented = properties.find((p) => p.client) || properties[0];
      setSelectedId(firstRented.id);
    }
  }, [properties, selectedId]);

  // A plaintext link is only known right after creation; clear it when switching property.
  useEffect(() => { setLink(null); setCheckoutUrl(null); }, [selectedId]);

  const selected: Property | undefined = properties.find((p) => p.id === selectedId);
  if (!selected) {
    if (properties.length === 0) {
      return <div className="text-center py-20 text-slate-500">No properties in your portfolio yet — deploy one from the Discovery Agent or Property Builder.</div>;
    }
    return <div className="text-center py-20 text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading properties...</div>;
  }

  const generateLink = async () => {
    setLinkBusy(true);
    try {
      const token = await createPortalToken(selected.id);
      setLink(portalUrl(token));
      toast({ title: 'Access link created', description: 'Valid for 90 days. Copy it now; it will not be shown again.' });
    } catch (e) {
      toast({ title: 'Could not create link', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setLinkBusy(false); }
  };

  const revokeLinks = async () => {
    setLinkBusy(true);
    try {
      await revokePortalTokens(selected.id);
      setLink(null);
      toast({ title: 'Links revoked', description: `All client links for ${selected.domain} stopped working.` });
    } catch (e) {
      toast({ title: 'Revoke failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setLinkBusy(false); }
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    toast({ title: 'Access link copied', description: 'Share it only with your renter.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const billViaStripe = async () => {
    if (!clientName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail.trim())) {
      toast({ title: 'Enter client name and a valid billing email', variant: 'destructive' });
      return;
    }
    setLeasing(true);
    try {
      const r = await createCheckoutLink({ propertyId: selected.id, clientName: clientName.trim(), clientEmail: clientEmail.trim(), monthlyRent: parseInt(rent) || 0 });
      setCheckoutUrl(r.url);
      toast({ title: 'Checkout link ready', description: 'Send it to the client. The property flips to Rented when they pay.' });
    } catch (e) {
      toast({ title: 'Could not create checkout', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setLeasing(false); }
  };

  const lease = async () => {
    if (!clientName.trim()) { toast({ title: 'Enter client name', variant: 'destructive' }); return; }
    setLeasing(true);
    try {
      await assignClient(selected.id, clientName.trim(), parseInt(rent) || 0);
      toast({ title: 'Lease activated', description: `${selected.domain} is now rented to ${clientName} at $${rent}/mo (saved to database).` });
      setClientName('');
    } catch (e) {
      toast({ title: 'Lease failed', description: e instanceof Error ? e.message : 'Could not save assignment.', variant: 'destructive' });
    } finally { setLeasing(false); }
  };

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    if (!link) {
      toast({ title: 'Generate an access link first', variant: 'destructive' });
      return;
    }
    // Opens your own mail client with the link pre-filled; nothing is sent automatically.
    window.location.href = inviteMailto(email, selected.domain, link);
    setEmail('');
  };

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="text-white font-semibold">Generate Client Access</h3>
          </div>

          <label className="text-xs text-slate-400 mb-1.5 block">Property</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 mb-4"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.domain} — {p.client || 'Available'}</option>
            ))}
          </select>

          {!selected.client && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-4">
              <p className="text-xs text-amber-300 mb-2 flex items-center gap-1.5"><FileSignature className="w-3.5 h-3.5" /> This asset is available — lease it to a client</p>
              <div className="flex gap-2 mb-2">
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client / business name" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 w-28">
                  <span className="text-slate-500 text-sm">$</span>
                  <input value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))} className="bg-transparent text-sm text-white outline-none w-full" />
                  <span className="text-slate-600 text-[10px]">/mo</span>
                </div>
              </div>
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" placeholder="Billing email" aria-label="Billing email" className="w-full mb-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
              <button onClick={billViaStripe} disabled={leasing} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm py-2 rounded-lg disabled:opacity-60">
                {leasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />} Create Stripe checkout link
              </button>
              {checkoutUrl && (
                <div className="mt-2 flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1.5">
                  <span className="text-[11px] text-slate-300 font-mono truncate flex-1">{checkoutUrl}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(checkoutUrl); toast({ title: 'Checkout link copied' }); }} aria-label="Copy checkout link" className="text-slate-400 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <button onClick={lease} disabled={leasing} className="mt-2 w-full text-[11px] text-slate-400 hover:text-white">Record lease without Stripe (billed elsewhere)</button>
            </div>
          )}

          <label className="text-xs text-slate-400 mb-1.5 block">Secure Access Link</label>
          {link ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 mb-2">
              <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-300 font-mono truncate flex-1" data-testid="portal-link">{link}</span>
              <button onClick={copyLink} aria-label="Copy link" className="text-slate-400 hover:text-white shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <button onClick={generateLink} disabled={linkBusy} className="w-full mb-2 flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 hover:border-sky-500 rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-60">
              {linkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Generate access link
            </button>
          )}
          <button onClick={revokeLinks} disabled={linkBusy} className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-400 disabled:opacity-60">
            <ShieldOff className="w-3.5 h-3.5" /> Revoke all links for this property
          </button>

          <form onSubmit={invite}>
            <label className="text-xs text-slate-400 mb-1.5 block">Email the link to your client</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 flex-1">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@business.com"
                  className="bg-transparent text-sm text-white placeholder:text-slate-600 outline-none w-full"
                />
              </div>
              <button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 rounded-lg">
                Compose
              </button>
            </div>
          </form>
          <p className="text-[11px] text-slate-500 mt-2">Links are random, hashed at rest, expire after 90 days and can be revoked anytime.</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Client View Preview</h3>
          </div>
          <div className="rounded-lg border border-slate-700 bg-[#0a0e1a] p-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-sky-400 to-emerald-400" />
              <div>
                <p className="text-xs font-bold text-white">{selected.client || 'Unassigned'}</p>
                <p className="text-[10px] text-slate-500">{selected.domain}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 my-3">
              <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                <Inbox className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                <p className="text-lg font-bold text-white font-mono">{selected.monthlyLeads}</p>
                <p className="text-[9px] text-slate-500">Leads this mo</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                <p className="text-lg font-bold text-white font-mono">#{selected.rankPosition}</p>
                <p className="text-[9px] text-slate-500">Avg ranking</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                <DollarSign className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                <p className="text-lg font-bold text-white font-mono">${selected.mrr}</p>
                <p className="text-[9px] text-slate-500">Monthly rent</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span className="text-xs text-emerald-400">Billing: {selected.client ? 'Active' : 'Not leased'}</span>
              <span className="text-[10px] text-slate-500 font-mono">Stripe · auto-renew</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 text-center">This is exactly what your renter sees when they log in.</p>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
