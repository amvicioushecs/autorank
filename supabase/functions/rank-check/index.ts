// Supabase Edge Function: rank-check
// Checks the Google organic position of each deployed property for "<niche> <city>" via treg,
// records rr_rank_checks, updates rank/trend/health on the property and raises rr_alerts.
//
// Two modes:
//  - User:  Authorization: Bearer <user JWT>, body { propertyId?: string }  -> that user's properties.
//  - Cron:  header x-cron-secret: <CRON_SECRET>  -> every user's deployed properties not checked in 20h,
//           using the service role (RLS bypassed; every query is scoped by user_id explicitly).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { handle, HttpError, json, requireUser, serviceClient } from '../_shared/http.ts';
import { callTreg, spentLast24h, dailyBudgetMicro } from '../_shared/treg.ts';
import { keywordFor } from '../_shared/discovery.ts';
import { detectAlert, findPosition, healthScore, nextTrend, notFoundPosition, rankChange, type RankedRow } from '../_shared/rank.ts';

const DEPTH = 50;

interface PropRow {
  id: string; user_id: string; domain: string; niche: string; city: string;
  rank_position: number | null; trend: unknown; monthly_leads: number; site_url: string | null;
}

async function checkOne(db: SupabaseClient, p: PropRow) {
  const keyword = keywordFor(p.niche, p.city);
  const r = await callTreg<{ output?: { results?: RankedRow[] } }>(db, p.user_id, 'treg.google.serp.organic', {
    q: keyword, country: 'us', language: 'en', limit: DEPTH,
  });
  if (!r.ok) return { id: p.id, error: r.errorText, costMicro: r.costMicro };
  const found = findPosition(r.data?.output?.results ?? [], p.domain);
  const pos = found ?? notFoundPosition(DEPTH);
  const prevVisible = p.rank_position;

  await db.from('rr_rank_checks').insert({ user_id: p.user_id, property_id: p.id, keyword, position: found, depth: DEPTH, call_id: r.callId });
  await db.from('rr_properties').update({
    rank_position: pos,
    rank_change: rankChange(prevVisible, pos),
    trend: nextTrend(p.trend, pos),
    health: healthScore({ position: pos, depth: DEPTH, deployed: !!p.site_url, monthlyLeads: p.monthly_leads ?? 0 }),
    last_rank_check_at: new Date().toISOString(),
  }).eq('id', p.id).eq('user_id', p.user_id);

  const alert = detectAlert(prevVisible, pos, DEPTH);
  if (alert) await db.from('rr_alerts').insert({ user_id: p.user_id, property_id: p.id, kind: alert.kind, message: `${p.domain}: ${alert.message}` });
  return { id: p.id, position: found, alert: alert?.kind ?? null, costMicro: r.costMicro };
}

const COLS = 'id, user_id, domain, niche, city, rank_position, trend, monthly_leads, site_url';

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret;

  if (isCron) {
    const db = serviceClient();
    const cutoff = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const { data, error } = await db.from('rr_properties').select(COLS).not('site_url', 'is', null)
      .or(`last_rank_check_at.is.null,last_rank_check_at.lt.${cutoff}`).limit(200);
    if (error) throw new HttpError(500, error.message);
    const results = [];
    const spentByUser = new Map<string, number>();
    for (const p of (data ?? []) as PropRow[]) {
      if (!spentByUser.has(p.user_id)) spentByUser.set(p.user_id, await spentLast24h(db, p.user_id));
      if (spentByUser.get(p.user_id)! >= dailyBudgetMicro()) { results.push({ id: p.id, skipped: 'budget' }); continue; }
      const res = await checkOne(db, p);
      spentByUser.set(p.user_id, spentByUser.get(p.user_id)! + res.costMicro);
      results.push(res);
    }
    return json({ mode: 'cron', checked: results.length, results });
  }

  const { supabase, user } = await requireUser(req);
  const { propertyId } = await req.json().catch(() => ({})) as { propertyId?: string };
  let q = supabase.from('rr_properties').select(COLS).eq('user_id', user.id);
  q = propertyId ? q.eq('id', propertyId) : q.not('site_url', 'is', null);
  const { data, error } = await q.limit(50);
  if (error) throw new HttpError(500, error.message);
  if ((await spentLast24h(supabase, user.id)) >= dailyBudgetMicro()) throw new HttpError(429, 'Daily treg budget reached');
  const results = [];
  for (const p of (data ?? []) as PropRow[]) results.push(await checkOne(supabase, p));
  return json({ mode: 'user', checked: results.length, results });
}));
