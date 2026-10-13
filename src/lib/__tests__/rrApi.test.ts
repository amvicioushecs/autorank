import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

const mock = vi.hoisted(() => ({ current: null as unknown as ReturnType<typeof createSupabaseMock> }));
vi.mock('@/lib/supabase', () => ({
  get supabase() { return mock.current.supabase; },
}));

import * as api from '@/lib/rrApi';

const opp = { id: 'opp-1', niche: 'Garage Door Repair', city: 'Charlotte, NC', searchVolume: 1000, competition: 20, cpc: 30, estRevenue: 1500, score: 80 };
const propRow = { id: 'prop-1', domain: 'charlottegaragedoorrepair.com', niche: opp.niche, city: opp.city, status: 'building', health: 40, rank_position: 28, rank_change: 0, keywords: 0, monthly_leads: 0, mrr: 0, client: null, trend: [1, 2] };

beforeEach(() => { mock.current = createSupabaseMock('user-1'); });

describe('ownership filters', () => {
  it('scopes every read to the signed-in user', async () => {
    await api.fetchProperties();
    await api.fetchOpportunities();
    await api.fetchLeads();
    for (const c of mock.current.calls) expect(c.filters).toContainEqual(['user_id', 'user-1']);
  });

  it('scopes writes to the signed-in user', async () => {
    await api.updateLeadStatus('lead-1', 'won');
    await api.updatePropertyClient('prop-1', 'Acme', 900);
    for (const c of mock.current.calls) expect(c.filters).toContainEqual(['user_id', 'user-1']);
  });

  it('refuses to query when signed out', async () => {
    mock.current = createSupabaseMock(null);
    await expect(api.fetchProperties()).rejects.toThrow('Sign in required');
    expect(mock.current.calls).toHaveLength(0);
  });
});

describe('client assignment status', () => {
  it('rented when a client is set, ranking when unassigned', async () => {
    expect(api.clientStatus('Acme')).toBe('rented');
    expect(api.clientStatus(null)).toBe('ranking');
    await api.updatePropertyClient('prop-1', null, 0);
    expect(mock.current.calls[0].args[0]).toMatchObject({ client: null, status: 'ranking' });
  });
});

describe('deployOpportunity', () => {
  it('creates the property before marking the opportunity deployed', async () => {
    mock.current.queue('rr_properties.insert', { data: propRow });
    mock.current.queue('rr_opportunities.update', { data: [{ id: 'opp-1' }] });
    const p = await api.deployOpportunity(opp);
    expect(p.id).toBe('prop-1');
    expect(mock.current.calls.map((c) => `${c.table}.${c.op}`)).toEqual(['rr_properties.insert', 'rr_opportunities.update']);
    expect(mock.current.calls[1].filters).toEqual([['id', 'opp-1'], ['user_id', 'user-1'], ['deployed', false]]);
  });

  it('leaves the opportunity untouched if property creation fails', async () => {
    mock.current.queue('rr_properties.insert', { error: new Error('insert failed') });
    await expect(api.deployOpportunity(opp)).rejects.toThrow('insert failed');
    expect(mock.current.calls.some((c) => c.table === 'rr_opportunities')).toBe(false);
  });

  it('rolls back when the opportunity was already deployed (zero rows updated)', async () => {
    mock.current.queue('rr_properties.insert', { data: propRow });
    mock.current.queue('rr_opportunities.update', { data: [] });
    await expect(api.deployOpportunity(opp)).rejects.toThrow('already deployed');
    expect(mock.current.calls.some((c) => c.op === 'delete')).toBe(true);
  });

  it('rolls back the property if marking the opportunity fails', async () => {
    mock.current.queue('rr_properties.insert', { data: propRow });
    mock.current.queue('rr_opportunities.update', { error: new Error('update failed') });
    await expect(api.deployOpportunity(opp)).rejects.toThrow('update failed');
    const del = mock.current.calls.find((c) => c.op === 'delete');
    expect(del).toMatchObject({ table: 'rr_properties', filters: [['id', 'prop-1'], ['user_id', 'user-1']] });
  });
});

describe('helpers', () => {
  it('builds a clean domain', () => {
    expect(api.domainForOpportunity({ city: 'St. Louis, MO', niche: "Roofer's & Gutters" })).toBe('stlouisroofersgutters.com');
  });
  it('formats relative time', () => {
    const now = Date.parse('2026-01-01T12:00:00Z');
    expect(api.relTime('2026-01-01T11:59:50Z', now)).toBe('just now');
    expect(api.relTime('2026-01-01T11:30:00Z', now)).toBe('30m ago');
    expect(api.relTime('2026-01-01T07:00:00Z', now)).toBe('5h ago');
    expect(api.relTime('2025-12-29T12:00:00Z', now)).toBe('3d ago');
  });
});
