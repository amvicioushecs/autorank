import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const fetchPortalView = vi.hoisted(() => vi.fn());
vi.mock('@/lib/portalApi', () => ({ fetchPortalView }));
import PortalView from '../PortalView';

const renderAt = (token: string) =>
  render(<MemoryRouter initialEntries={[`/portal/${token}`]}><Routes><Route path="/portal/:token" element={<PortalView />} /></Routes></MemoryRouter>);

describe('PortalView', () => {
  it('shows property and leads for a valid token', async () => {
    fetchPortalView.mockResolvedValue({
      property: { domain: 'a.com', niche: 'Plumbing', city: 'Austin, TX', client: 'BlueFlow', rankPosition: 3, monthlyLeads: 12, trend: [] },
      leads: [{ id: '1', name: 'Marcus', service: 'Burst pipe', value: 1, quality: 'high', status: 'new', channel: 'call', created_at: '2026-10-01T00:00:00Z' }],
      expiresAt: '2027-01-01',
    });
    renderAt('tok');
    expect(await screen.findByText('BlueFlow')).toBeInTheDocument();
    expect(screen.getByText(/Marcus/)).toBeInTheDocument();
    expect(fetchPortalView).toHaveBeenCalledWith('tok');
  });
  it('shows an invalid-link message when the token does not resolve', async () => {
    fetchPortalView.mockResolvedValue(null);
    renderAt('bad');
    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
  });
});
