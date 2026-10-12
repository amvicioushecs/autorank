import { vi } from 'vitest';

export interface Call { table: string; op: string; args: unknown[]; filters: [string, unknown][] }
type Result = { data?: unknown; error?: unknown };

/** Minimal chainable fake of the supabase-js query builder that records every call. */
export function createSupabaseMock(userId: string | null = 'user-1') {
  const calls: Call[] = [];
  const results: Record<string, Result[]> = {};
  const queue = (key: string, r: Result) => { (results[key] ||= []).push(r); };

  const from = vi.fn((table: string) => {
    const call: Call = { table, op: 'select', args: [], filters: [] };
    calls.push(call);
    const resolve = () => {
      const r = results[`${table}.${call.op}`]?.shift() ?? { data: [], error: null };
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    };
    const b: Record<string, unknown> = {
      select: () => b,
      insert: (row: unknown) => { call.op = 'insert'; call.args = [row]; return b; },
      update: (row: unknown) => { call.op = 'update'; call.args = [row]; return b; },
      delete: () => { call.op = 'delete'; return b; },
      eq: (col: string, v: unknown) => { call.filters.push([col, v]); return b; },
      order: () => b,
      limit: () => b,
      single: () => b,
      then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => resolve().then(ok, bad),
    };
    return b;
  });

  const supabase = {
    from,
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: userId ? { user: { id: userId } } : null } })) },
    functions: { invoke: vi.fn() },
  };
  return { supabase, calls, queue };
}
