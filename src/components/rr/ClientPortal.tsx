import React, { useState, useEffect } from 'react';
import { useRRData } from '@/contexts/RRDataContext';
import { Property } from '@/data/platformData';
import { Users, Link2, Copy, Check, Mail, Eye, Inbox, DollarSign, TrendingUp, Loader2, FileSignature } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ClientPortal: React.FC = () => {
  const { properties, assignClient } = useRRData();
  const [selectedId, setSelectedId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [rent, setRent] = useState('1500');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [leasing, setLeasing] = useState(false);
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);

  useEffect(() => {
    if (!selectedId && properties.length) {
      const firstRented = properties.find((p) => p.client) || properties[0];
      setSelectedId(firstRented.id);
    }
  }, [properties, selectedId]);

  const selected: Property | undefined = properties.find((p) => p.id === selectedId);
  if (!selected) {
    if (properties.length === 0) {
      return <div className="text-center py-20 text-slate-500">No properties in your portfolio yet — deploy one from the Discovery Agent or Property Builder.</div>;
    }
    return <div className="text-center py-20 text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading properties...</div>;
  }

  const link = `https://portal.rankforge.io/c/${selected.id.slice(0, 8)}-${selected.domain.split('.')[0]}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    toast({ title: 'Access link copied', description: 'Share with your renter for their branded dashboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const lease = async () => {
    if (!clientName.trim()) { toast({ title: 'Enter client name', variant: 'destructive' }); return; }
    setLeasing(true);
    try {
      await assignClient(selected.id, clientName.trim(), parseInt(rent) || 0);
      toast({ title: 'Lease activated', description: `${selected.domain} is now rented to ${clientName} at $${rent}/mo (saved to database).` });
      setClientName('');
    } catch (e) {
      toast({ title: 'Lease failed', description: 'Could not save assignment.', variant: 'destructive' });
    } finally { setLeasing(false); }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await fetch('https://famous.ai/api/crm/6a19aa7e9b69056178b8830a/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: selected.client || undefined,
          phone: phone.trim() || undefined,
          sms_opt_in: smsOptIn === true,
          source: 'client-portal',
          tags: ['client-portal', selected.niche.toLowerCase()],
        }),
      });
    } catch (_) { /* ignore */ }
    setSending(false);
    setEmail('');
    setPhone('');
    toast({ title: 'Portal invite sent', description: `Restricted Client View access granted for ${selected.domain}.` });
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
              <button onClick={lease} disabled={leasing} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm py-2 rounded-lg disabled:opacity-60">
                {leasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />} Activate Lease &amp; Bill via Stripe
              </button>
            </div>
          )}

          <label className="text-xs text-slate-400 mb-1.5 block">Unique Access Link</label>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 mb-4">
            <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-300 font-mono truncate flex-1">{link}</span>
            <button onClick={copyLink} className="text-slate-400 hover:text-white shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <form onSubmit={invite}>
            <label className="text-xs text-slate-400 mb-1.5 block">Invite Client by Email</label>
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
              <button type="submit" disabled={sending} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm px-4 rounded-lg disabled:opacity-60">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
              </button>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              aria-label="Phone number (optional)"
              className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500"
            />
            <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer">
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 accent-sky-500" />
              Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
            </label>
          </form>
          <p className="text-[11px] text-slate-500 mt-2">Grants a restricted "Client View" with their lead metrics &amp; billing status.</p>
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
