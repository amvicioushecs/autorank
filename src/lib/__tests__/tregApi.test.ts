import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

const mock = vi.hoisted(() => ({ current: null as unknown as ReturnType<typeof createSupabaseMock> }));
vi.mock('@/lib/supabase', () => ({ get supabase() { return mock.current.supabase; } }));

import { fetchKeywordMetrics, fetchSerp, scoreOpportunity, microToUsd } from '@/lib/tregApi';

beforeEach(() => { mock.current = createSupabaseMock('user-1'); });

describe('treg client', () => {
  it('calls the treg-proxy function with the routed endpoint and maps rows', async () => {
    mock.current.supabase.functions.invoke.mockResolvedValue({
      data: { data: { output: { rows: [{ keyword: 'garage door repair', search_volume: 1900, cpc: '22.5', competition: 'LOW', competition_index: 12, monthly_searches: [{ search_volume: 3 }, { search_volume: 2 }] }] } }, callId: 'c1', costMicro: 1790, servedBy: 'x' },
      error: null,
    });
    const res = await fetchKeywordMetrics(['garage door repair']);
    expect(mock.current.supabase.functions.invoke).toHaveBeenCalledWith('treg-proxy', { body: { endpoint: 'treg.google.keywords.volume', body: { keywords: ['garage door repair'], country: 'us', language: 'en' } } });
    expect(res.rows[0]).toEqual({ keyword: 'garage door repair', searchVolume: 1900, cpc: 22.5, competition: 'LOW', competitionIndex: 12, monthly: [2, 3] });
    expect(res.callId).toBe('c1');
  });

  it('maps SERP results and derives domains', async () => {
    mock.current.supabase.functions.invoke.mockResolvedValue({
      data: { data: { output: { results: [{ url: 'https://www.example.com/a', title: 'A', description: 'd' }] } }, callId: null, costMicro: 0, servedBy: null },
      error: null,
    });
    const { results } = await fetchSerp('roofer charlotte');
    expect(results[0]).toEqual({ position: 1, title: 'A', link: 'https://www.example.com/a', snippet: 'd', domain: 'example.com' });
  });

  it('surfaces proxy errors', async () => {
    mock.current.supabase.functions.invoke.mockResolvedValue({ data: { error: 'TREG_API_KEY not configured' }, error: null });
    await expect(fetchSerp('x')).rejects.toThrow('TREG_API_KEY not configured');
  });
});

describe('scoreOpportunity', () => {
  it('rewards demand, CPC and low competition and stays within bounds', () => {
    const good = scoreOpportunity({ keyword: 'a', searchVolume: 5000, cpc: 80, competition: 'LOW', competitionIndex: 0, monthly: [] });
    const bad = scoreOpportunity({ keyword: 'b', searchVolume: 10, cpc: 0.5, competition: 'HIGH', competitionIndex: 100, monthly: [] });
    expect(good.score).toBe(99);
    expect(bad.score).toBeGreaterThanOrEqual(40);
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.estRevenue).toBe(300);
  });
  it('formats micro-dollars', () => {
    expect(microToUsd(1790)).toBe('$0.0018');
    expect(microToUsd(1_500_000)).toBe('$1.500');
  });
});
