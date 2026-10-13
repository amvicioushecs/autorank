import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Property, Opportunity, Lead } from '@/data/platformData';
import * as api from '@/lib/rrApi';
import { useAuth } from '@/contexts/AuthContext';

interface RRData {
  properties: Property[];
  opportunities: Opportunity[];
  leads: Lead[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProperty: typeof api.createProperty;
  createOpportunity: typeof api.createOpportunity;
  deployOpportunity: (o: Opportunity, domain?: string) => Promise<void>;
  setLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
  assignClient: (id: string, client: string | null, mrr: number) => Promise<void>;
}

const Ctx = createContext<RRData | null>(null);

export const RRDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, o, l] = await Promise.all([api.fetchProperties(), api.fetchOpportunities(), api.fetchLeads()]);
      setProperties(p);
      setOpportunities(o);
      setLeads(l);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('RR data load failed', e);
      setError(msg);
      toast({ title: 'Could not load your portfolio', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Signed out: clear everything — no data leaves RLS without an owner
    if (!userId) {
      setProperties([]); setOpportunities([]); setLeads([]); setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try { await api.seedStarter(); } catch (e) { console.warn('Starter seed skipped', e); }
      if (!cancelled) await refresh();
    })();
    return () => { cancelled = true; };
  }, [userId, refresh]);

  const createProperty = useCallback<typeof api.createProperty>(async (p) => {
    const created = await api.createProperty(p);
    setProperties((prev) => [created, ...prev]);
    return created;
  }, []);

  const createOpportunity = useCallback<typeof api.createOpportunity>(async (o) => {
    const created = await api.createOpportunity(o);
    setOpportunities((prev) => [created, ...prev].sort((a, b) => b.score - a.score));
    return created;
  }, []);

  const deployOpportunity = useCallback(async (o: Opportunity, domain?: string) => {
    const created = await api.deployOpportunity(o, domain);
    setOpportunities((prev) => prev.filter((x) => x.id !== o.id));
    setProperties((prev) => [created, ...prev]);
  }, []);

  const setLeadStatus = useCallback(async (id: string, status: Lead['status']) => {
    await api.updateLeadStatus(id, status);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }, []);

  const assignClient = useCallback(async (id: string, client: string | null, mrr: number) => {
    await api.updatePropertyClient(id, client, mrr);
    const status = api.clientStatus(client);
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, client, mrr, status } : p)));
  }, []);

  const value = useMemo<RRData>(
    () => ({ properties, opportunities, leads, loading, error, refresh, createProperty, createOpportunity, deployOpportunity, setLeadStatus, assignClient }),
    [properties, opportunities, leads, loading, error, refresh, createProperty, createOpportunity, deployOpportunity, setLeadStatus, assignClient],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useRRData = (): RRData => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRRData must be used within RRDataProvider');
  return c;
};
