import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

const mock = vi.hoisted(() => ({ current: null as unknown as ReturnType<typeof createSupabaseMock> }));
vi.mock('@/lib/supabase', () => ({ get supabase() { return mock.current.supabase; } }));
import { parseSeedInput, pickDomain, runScan } from '@/lib/discoveryApi';

beforeEach(() => { mock.current = createSupabaseMock('user-1'); });

describe('discoveryApi', () => {
  it('parses seeds on newlines/semicolons, keeping commas in cities', () => {
    expect(parseSeedInput('Austin, TX; Mesa, AZ\n  austin, TX \nx')).toEqual(['Austin, TX', 'Mesa, AZ', 'austin, TX']);
  });
  it('picks the first available domain, falling back when unknown', async () => {
    mock.current.supabase.functions.invoke.mockResolvedValueOnce({ data: { results: [{ domain: 'a.com', available: false }, { domain: 'b.com', available: true }] }, error: null });
    expect(await pickDomain(['a.com', 'b.com'])).toEqual({ domain: 'b.com', verified: true });
    mock.current.supabase.functions.invoke.mockResolvedValueOnce({ data: { error: 'down' }, error: null });
    expect(await pickDomain(['a.com', 'b.com'])).toEqual({ domain: 'a.com', verified: false });
  });
  it('invokes the discovery-scan function and surfaces errors', async () => {
    mock.current.supabase.functions.invoke.mockResolvedValueOnce({ data: { error: 'Add at least one niche' }, error: null });
    await expect(runScan()).rejects.toThrow('Add at least one niche');
    expect(mock.current.supabase.functions.invoke).toHaveBeenCalledWith('discovery-scan', { body: {} });
  });
});
