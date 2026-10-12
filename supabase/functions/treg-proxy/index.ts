// Supabase Edge Function: treg-proxy
// Keeps the treg.to token server-side and relays catalog calls from the dashboard.
//
// Request  (from src/lib/tregApi.ts via supabase.functions.invoke('treg-proxy')):
//   { endpoint: "treg.google.keywords.volume", body: { ... } }
// Response:
//   { data: <treg JSON: { output, raw, _treg }>, callId, costMicro, servedBy }
//   or { error: string } with a non-2xx status.
//
// Secrets: TREG_API_KEY (required). SUPABASE_URL / SUPABASE_ANON_KEY are injected by Supabase.
// treg docs: https://treg.to/docs  (POST https://treg.to/call/<endpoint_id>, header X-Treg-Token)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TREG_BASE = 'https://treg.to';

// Only endpoints the app actually uses. Add ids here deliberately — every call is billed.
const ALLOWED_ENDPOINTS = new Set(['treg.google.keywords.volume', 'treg.google.serp.organic', 'treg.google.serp.maps']);

// Hard per-call spend cap passed to treg's router (USD).
const MAX_COST_USD = Deno.env.get('TREG_MAX_COST_USD') ?? '0.25';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = Deno.env.get('TREG_API_KEY');
  if (!token) return json({ error: 'TREG_API_KEY not configured on the server' }, 500);

  // Require a signed-in user; usage is attributed to them.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json({ error: 'Sign in required' }, 401);

  let payload: { endpoint?: string; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const endpoint = payload.endpoint ?? '';
  if (!ALLOWED_ENDPOINTS.has(endpoint)) return json({ error: `Endpoint not allowed: ${endpoint}` }, 400);

  let upstream: Response;
  try {
    upstream = await fetch(`${TREG_BASE}/call/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Treg-Token': token,
        'X-Treg-Meta': `customer=${user.id}`,
        'X-Treg-Route-Max-Cost': MAX_COST_USD,
      },
      body: JSON.stringify(payload.body ?? {}),
    });
  } catch (e) {
    return json({ error: `treg unreachable: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  const callId = upstream.headers.get('X-Treg-Call-Id');
  const costMicro = Number(upstream.headers.get('X-Treg-Cost-Micro') ?? 0) || 0;
  const text = await upstream.text();
  let data: Record<string, unknown> | null = null;
  try { data = JSON.parse(text); } catch { /* non-JSON */ }
  const servedBy =
    upstream.headers.get('X-Treg-Served-By') ??
    ((data?._treg as { served_by?: string } | undefined)?.served_by ?? null);

  // Best-effort usage log (table rr_treg_usage, RLS: user_id = auth.uid()).
  const { error: logErr } = await supabase.from('rr_treg_usage').insert({
    user_id: user.id, endpoint, cost_micro: costMicro, call_id: callId, status: upstream.status,
  });
  if (logErr) console.warn('usage log failed', logErr.message);

  if (!upstream.ok) {
    const msg = (data?.detail ?? data?.error ?? text.slice(0, 300)) || `treg error ${upstream.status}`;
    return json({ error: typeof msg === 'string' ? msg : JSON.stringify(msg), callId }, upstream.status === 401 ? 502 : upstream.status);
  }
  return json({ data, callId, costMicro, servedBy });
});
