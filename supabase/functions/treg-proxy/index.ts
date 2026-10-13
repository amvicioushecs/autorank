// Supabase Edge Function: treg-proxy
// Keeps the treg.to token server-side and relays allow-listed catalog calls from the dashboard.
// Request:  { endpoint: "treg.google.keywords.volume", body: { ... } }   (src/lib/tregApi.ts)
// Response: { data: { output, raw, _treg }, callId, costMicro, servedBy }  or  { error }
// Secrets: TREG_API_KEY (required), TREG_MAX_COST_USD, TREG_DAILY_BUDGET_USD. Docs: https://treg.to/docs
import { handle, HttpError, json, requireUser } from '../_shared/http.ts';
import { assertBudget, callTreg } from '../_shared/treg.ts';

const ALLOWED_ENDPOINTS = new Set(['treg.google.keywords.volume', 'treg.google.serp.organic', 'treg.google.serp.maps']);

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const { supabase, user } = await requireUser(req);
  let payload: { endpoint?: string; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
  const endpoint = payload.endpoint ?? '';
  if (!ALLOWED_ENDPOINTS.has(endpoint)) throw new HttpError(400, `Endpoint not allowed: ${endpoint}`);
  await assertBudget(supabase, user.id);

  const r = await callTreg(supabase, user.id, endpoint, payload.body);
  if (!r.ok) return json({ error: r.errorText, callId: r.callId }, r.status === 401 ? 502 : r.status);
  return json({ data: r.data, callId: r.callId, costMicro: r.costMicro, servedBy: r.servedBy });
}));
