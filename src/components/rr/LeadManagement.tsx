import React, { useState } from 'react';
import { Lead } from '@/data/platformData';
import { useRRData } from '@/contexts/RRDataContext';
import { Inbox, Phone, MessageSquare, FileText, Check, ShieldCheck, Send, AlertTriangle, Mail, Smartphone, Webhook, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const channelIcon = { call: Phone, chat: MessageSquare, form: FileText };
const qualityMeta = {
  high: { c: '#34d399', l: 'High' },
  medium: { c: '#fbbf24', l: 'Medium' },
  low: { c: '#fb7185', l: 'Low' },
};
const statusMeta: Record<string, { c: string; l: string }> = {
  new: { c: '#38bdf8', l: 'New' },
  verified: { c: '#a78bfa', l: 'Verified' },
  forwarded: { c: '#34d399', l: 'Forwarded' },
  flagged: { c: '#fb7185', l: 'Flagged (spam)' },
};

const LeadManagement: React.FC = () => {
  const { leads, setLeadStatus, loading } = useRRData();
  const [channels, setChannels] = useState({ sms: true, email: true, webhook: false });
  const [busy, setBusy] = useState<string | null>(null);

  const verify = async (id: string) => {
    setBusy(id);
    try {
      await setLeadStatus(id, 'verified');
      toast({ title: 'AI verification passed', description: 'Lead quality confirmed by Outreach Agent.' });
    } finally { setBusy(null); }
  };
  const forward = async (id: string, name: string) => {
    setBusy(id);
    try {
      await setLeadStatus(id, 'forwarded');
      const active = Object.entries(channels).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(' + ');
      toast({ title: 'Lead forwarded', description: `${name} sent to client via ${active || 'no channel set'}.` });
    } finally { setBusy(null); }
  };

  const totalValue = leads.filter((l) => l.quality !== 'low').reduce((s, l) => s + l.value, 0);
  const verifiedCount = leads.filter((l) => l.status === 'verified' || l.status === 'forwarded').length;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500">Pipeline Value (mo)</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">${totalValue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500">Verified Leads</p>
          <p className="text-2xl font-bold text-white font-mono">{verifiedCount}<span className="text-sm text-slate-500">/{leads.length}</span></p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500">Spam Blocked</p>
          <p className="text-2xl font-bold text-rose-400 font-mono">{leads.filter((l) => l.status === 'flagged').length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-sky-400" />
            <h3 className="text-white font-semibold text-sm">Verification Pipeline</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading leads...</div>
          ) : (
          <div className="divide-y divide-slate-800">
            {leads.map((l) => {
              const CIcon = channelIcon[l.channel];
              const q = qualityMeta[l.quality];
              const st = statusMeta[l.status];
              const isBusy = busy === l.id;
              return (
                <div key={l.id} className="px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <CIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{l.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: q.c, background: `${q.c}1a` }}>{q.l}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{l.service} · {l.property}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm font-bold font-mono" style={{ color: l.value ? '#34d399' : '#64748b' }}>{l.value ? `$${l.value}` : '—'}</p>
                      <p className="text-[10px] text-slate-600">{l.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 pl-12">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1" style={{ color: st.c, background: `${st.c}1a` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.c }} /> {st.l}
                    </span>
                    {l.status === 'new' && (
                      <button onClick={() => verify(l.id)} disabled={isBusy} className="text-[11px] flex items-center gap-1 text-violet-300 hover:text-white bg-violet-500/15 hover:bg-violet-500/30 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Verify
                      </button>
                    )}
                    {l.status === 'verified' && (
                      <button onClick={() => forward(l.id, l.name)} disabled={isBusy} className="text-[11px] flex items-center gap-1 text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Forward to client
                      </button>
                    )}
                    {l.status === 'forwarded' && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Delivered</span>}
                    {l.status === 'flagged' && <span className="text-[11px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Auto-rejected</span>}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 h-fit">
          <h3 className="text-white font-semibold text-sm mb-1">Delivery Channels</h3>
          <p className="text-xs text-slate-500 mb-4">Let each renter choose how they receive verified leads.</p>
          {[
            { key: 'sms', label: 'SMS (Twilio)', icon: Smartphone, desc: 'Instant text alert' },
            { key: 'email', label: 'Email', icon: Mail, desc: 'Formatted lead report' },
            { key: 'webhook', label: 'CRM Webhook', icon: Webhook, desc: 'POST to client CRM' },
          ].map((c) => {
            const Icon = c.icon;
            const on = channels[c.key as keyof typeof channels];
            return (
              <button
                key={c.key}
                onClick={() => setChannels((ch) => ({ ...ch, [c.key]: !ch[c.key as keyof typeof channels] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 border transition-all ${on ? 'bg-sky-500/10 border-sky-500/40' : 'bg-slate-800/40 border-slate-700/50'}`}
              >
                <Icon className={`w-4 h-4 ${on ? 'text-sky-400' : 'text-slate-500'}`} />
                <div className="text-left flex-1">
                  <p className={`text-sm font-medium ${on ? 'text-white' : 'text-slate-400'}`}>{c.label}</p>
                  <p className="text-[10px] text-slate-500">{c.desc}</p>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${on ? 'bg-sky-500' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeadManagement;
