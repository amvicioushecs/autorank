import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Alert, fetchAlerts, markAlertsRead, runRankCheck } from '@/lib/rankApi';
import { useRRData } from '@/contexts/RRDataContext';

const RankAlerts: React.FC = () => {
  const { refresh } = useRRData();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => fetchAlerts().then(setAlerts).catch(() => setAlerts([])), []);
  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setRunning(true);
    try {
      const r = await runRankCheck();
      const errors = r.results.filter((x) => x.error).length;
      toast({ title: 'Rank check complete', description: `${r.checked} properties checked${errors ? `, ${errors} failed` : ''}.` });
      await Promise.all([refresh(), load()]);
    } catch (e) {
      toast({ title: 'Rank check failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setRunning(false); }
  };

  const unread = alerts.filter((a) => !a.readAt);
  const markRead = async () => {
    try { await markAlertsRead(unread.map((a) => a.id)); await load(); } catch { /* non-critical */ }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-semibold text-sm">Ranking alerts {unread.length > 0 && <span className="ml-1 text-xs bg-amber-500/20 text-amber-300 rounded-full px-2">{unread.length} new</span>}</h3>
        </div>
        <div className="flex gap-2">
          {unread.length > 0 && <button onClick={markRead} className="text-xs text-slate-400 hover:text-white">Mark read</button>}
          <button onClick={run} disabled={running} className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 disabled:opacity-60">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check rankings now
          </button>
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-slate-500">No alerts yet. Deployed sites are checked daily; drops of 3+ spots, falling out of the top 50 and entering the top 3 show up here.</p>
      ) : (
        <ul className="space-y-1.5">
          {alerts.slice(0, 8).map((a) => (
            <li key={a.id} className={`text-xs ${a.readAt ? 'text-slate-500' : 'text-slate-200'}`}>
              <span className="text-slate-600 font-mono mr-2">{new Date(a.createdAt).toLocaleDateString()}</span>{a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RankAlerts;
