import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Property, Opportunity, Lead } from '@/data/platformData';
import * as api from '@/lib/rrApi';
import { useAuth } from '@/contexts/AuthContext';

interface RRData {
  properties: Property[];
  opportunities: Opportunity[];
  leads: Lead[];
  loading: boolean;
  refresh: () => Promise<void>;
  createProperty: typeof api.createProperty;
  createOpportunity: typeof api.createOpportunity;
  deployOpportunity: (o: Opportunity) => Promise<void>;
  setLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
  assignClient: (id: string, client: string, mrr: number) => Promise<void>;
}

const Ctx = createContext<RRData | null>(null);

export const RRDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [p, o, l] = await Promise.all([api.fetchProperties(), api.fetchOpportunities(), api.fetchLeads()]);
      setProperties(p);
      setOpportunities(o);
      setLeads(l);
    } catch (e) {
      console.error('RR data load failed', e);
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

  const createProperty: typeof api.createProperty = async (p) => {
    const created = await api.createProperty(p);
    setProperties((prev) => [created, ...prev]);
    return created;
  };

  const createOpportunity: typeof api.createOpportunity = async (o) => {
    const created = await api.createOpportunity(o);
    setOpportunities((prev) => [created, ...prev].sort((a, b) => b.score - a.score));
    return created;
  };

  const deployOpportunity = async (o: Opportunity) => {
    const created = await api.deployOpportunity(o);
    setOpportunities((prev) => prev.filter((x) => x.id !== o.id));
    setProperties((prev) => [created, ...prev]);
  };

  const setLeadStatus = async (id: string, status: Lead['status']) => {
    await api.updateLeadStatus(id, status);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  const assignClient = async (id: string, client: string, mrr: number) => {
    await api.updatePropertyClient(id, client, mrr);
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, client, mrr, status: 'rented' } : p)));
  };

  return (
    <Ctx.Provider value={{ properties, opportunities, leads, loading, refresh, createProperty, createOpportunity, deployOpportunity, setLeadStatus, assignClient }}>
      {children}
    </Ctx.Provider>
  );
};

export const useRRData = (): RRData => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRRData must be used within RRDataProvider');
  return c;
};
