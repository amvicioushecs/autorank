import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const api = vi.hoisted(() => ({
  fetchProperties: vi.fn(), fetchOpportunities: vi.fn(), fetchLeads: vi.fn(), seedStarter: vi.fn(),
  createProperty: vi.fn(), createOpportunity: vi.fn(), deployOpportunity: vi.fn(), updateLeadStatus: vi.fn(),
  updatePropertyClient: vi.fn(), clientStatus: (c: string | null) => (c ? 'rented' : 'ranking'),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rrApi', () => api);
vi.mock('@/components/ui/use-toast', () => ({ toast }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

import { RRDataProvider, useRRData } from '@/contexts/RRDataContext';

const prop = { id: 'p1', domain: 'a.com', niche: 'n', city: 'c', status: 'rented', health: 1, rankPosition: 1, rankChange: 0, keywords: 0, monthlyLeads: 0, mrr: 500, client: 'Acme', trend: [] };

let latest: ReturnType<typeof useRRData>;
const Probe = () => { latest = useRRData(); return null; };

beforeEach(() => {
  vi.clearAllMocks();
  api.seedStarter.mockResolvedValue(0);
  api.fetchProperties.mockResolvedValue([prop]);
  api.fetchOpportunities.mockResolvedValue([]);
  api.fetchLeads.mockResolvedValue([]);
});

describe('RRDataProvider', () => {
  it('keeps action identities stable across renders (no duplicate effects)', async () => {
    render(<RRDataProvider><Probe /></RRDataProvider>);
    await waitFor(() => expect(latest.loading).toBe(false));
    const first = latest.createProperty;
    await act(async () => { await latest.refresh(); });
    expect(latest.createProperty).toBe(first);
  });

  it('unassigning a client sets status to ranking locally', async () => {
    render(<RRDataProvider><Probe /></RRDataProvider>);
    await waitFor(() => expect(latest.properties).toHaveLength(1));
    await act(async () => { await latest.assignClient('p1', null, 0); });
    expect(api.updatePropertyClient).toHaveBeenCalledWith('p1', null, 0);
    expect(latest.properties[0]).toMatchObject({ client: null, mrr: 0, status: 'ranking' });
  });

  it('surfaces load failures via error state and a toast', async () => {
    api.fetchLeads.mockRejectedValue(new Error('permission denied'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RRDataProvider><Probe /></RRDataProvider>);
    await waitFor(() => expect(latest.error).toBe('permission denied'));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
