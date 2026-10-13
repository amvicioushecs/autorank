import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

const TREG_BASE = 'https://treg.to';

export interface TregResult<T = Record<string, unknown>> {
  data: T | null;
  callId: string | null;
  costMicro: number;
  servedBy: string | null;
  status: number;
  ok: boolean;
  errorText: string | null;
}

export const dailyBudgetMicro = () => Math.round(Number(Deno.env.get('TREG_DAILY_BUDGET_USD') ?? '2') * 1_000_000);

export async function spentLast24h(supabase: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase.from('rr_treg_usage').select('cost_micro').eq('user_id', userId).gte('created_at', since);
  if (error) throw new HttpError(500, `Could not check usage budget: ${error.message}`);
  return (data ?? []).reduce((s: number, r: { cost_micro: number | null }) => s + (Number(r.cost_micro) || 0), 0);
}

export async function assertBudget(supabase: SupabaseClient, userId: string): Promise<number> {
  const spent = await spentLast24h(supabase, userId);
  const budget = dailyBudgetMicro();
  if (spent >= budget) {
    throw new HttpError(429, `Daily treg budget reached ($${(spent / 1e6).toFixed(2)} of $${(budget / 1e6).toFixed(2)}).`);
  }
  return budget - spent;
}

/** POST https://treg.to/call/<endpoint> with the server-side token; logs usage for the user. */
export async function callTreg<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  body: unknown,
): Promise<TregResult<T>> {
  const token = Deno.env.get('TREG_API_KEY');
  if (!token) throw new HttpError(500, 'TREG_API_KEY not configured on the server');
  let res: Response;
  try {
    res = await fetch(`${TREG_BASE}/call/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Treg-Token': token,
        'X-Treg-Meta': `customer=${userId}`,
        'X-Treg-Route-Max-Cost': Deno.env.get('TREG_MAX_COST_USD') ?? '0.25',
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch (e) {
    throw new HttpError(502, `treg unreachable: ${e instanceof Error ? e.message : String(e)}`);
  }
  const callId = res.headers.get('X-Treg-Call-Id');
  const costMicro = Number(res.headers.get('X-Treg-Cost-Micro') ?? 0) || 0;
  const text = await res.text();
  let data: (T & { _treg?: { served_by?: string } }) | null = null;
  try {
    data = JSON.parse(text);
  } catch { /* non-JSON */ }
  const servedBy = res.headers.get('X-Treg-Served-By') ?? data?._treg?.served_by ?? null;

  const { error: logErr } = await supabase.from('rr_treg_usage').insert({
    user_id: userId,
    endpoint,
    cost_micro: costMicro,
    call_id: callId,
    status: res.status,
  });
  if (logErr) console.warn('usage log failed', logErr.message);

  const errObj = data as unknown as { detail?: unknown; error?: unknown } | null;
  const errorText = res.ok ? null : String(errObj?.detail ?? errObj?.error ?? text.slice(0, 300)) || `treg error ${res.status}`;
  return { data, callId, costMicro, servedBy, status: res.status, ok: res.ok, errorText };
}
