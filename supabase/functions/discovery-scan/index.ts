// Supabase Edge Function: discovery-scan
// Batch-scores niche x city combinations from the user's discovery seeds using treg:
//   1. one keyword volume/CPC call for all new combos,
//   2. organic SERP checks for the most promising few (directory share = weakness),
//   3. upserts rr_opportunities and records a rr_scan_runs row.
// Body (optional): { maxCombos?: number, serpChecks?: number }
import { handle, HttpError, json, requireUser } from '../_shared/http.ts';
import { assertBudget, callTreg } from '../_shared/treg.ts';
import { combos, comboKey, mapKeywordRow, scoreOpportunity, serpWeakness, type SerpRow } from '../_shared/discovery.ts';

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const { supabase, user } = await requireUser(req);
  const opts = await req.json().catch(() => ({})) as { maxCombos?: number; serpChecks?: number };
  const maxCombos = Math.min(Math.max(Number(opts.maxCombos) || 25, 1), 100);
  const serpChecks = Math.min(Math.max(Number(opts.serpChecks ?? 5), 0), 20);

  const [{ data: seeds, error: seedErr }, { data: existing, error: exErr }] = await Promise.all([
    supabase.from('rr_discovery_seeds').select('kind, value').eq('user_id', user.id),
    supabase.from('rr_opportunities').select('niche, city').eq('user_id', user.id),
  ]);
  if (seedErr || exErr) throw new HttpError(500, (seedErr ?? exErr)!.message);
  const niches = (seeds ?? []).filter((s) => s.kind === 'niche').map((s) => s.value as string);
  const cities = (seeds ?? []).filter((s) => s.kind === 'city').map((s) => s.value as string);
  if (!niches.length || !cities.length) throw new HttpError(400, 'Add at least one niche and one city first');

  const existingKeys = new Set((existing ?? []).map((o) => comboKey(o.niche, o.city)));
  const todo = combos(niches, cities, existingKeys).slice(0, maxCombos);
  if (!todo.length) return json({ scanned: 0, inserted: 0, costMicro: 0, message: 'Every combination is already scored' });

  await assertBudget(supabase, user.id);
  const { data: run } = await supabase.from('rr_scan_runs').insert({ user_id: user.id, combos: todo.length, status: 'running' })
    .select('id').single();
  let cost = 0;
  try {
    const kw = await callTreg<{ output?: { rows?: Record<string, unknown>[] } }>(supabase, user.id, 'treg.google.keywords.volume', {
      keywords: todo.map((t) => t.keyword),
      country: 'us',
      language: 'en',
    });
    cost += kw.costMicro;
    if (!kw.ok) throw new HttpError(502, kw.errorText ?? 'keyword lookup failed');
    const byKeyword = new Map((kw.data?.output?.rows ?? []).map((r) => {
      const m = mapKeywordRow(r);
      return [m.keyword, m] as const;
    }));

    const scored = todo.map((t) => {
      const m = byKeyword.get(t.keyword) ?? { keyword: t.keyword, searchVolume: 0, cpc: 0, competitionIndex: 50 };
      return { ...t, m, weakness: null as number | null, ...scoreOpportunity(m) };
    }).sort((a, b) => b.score - a.score);

    for (const s of scored.filter((x) => x.m.searchVolume > 0).slice(0, serpChecks)) {
      const serp = await callTreg<{ output?: { results?: SerpRow[] } }>(supabase, user.id, 'treg.google.serp.organic', {
        q: s.keyword,
        country: 'us',
        language: 'en',
        limit: 10,
      });
      cost += serp.costMicro;
      if (!serp.ok) continue;
      s.weakness = serpWeakness(serp.data?.output?.results ?? []);
      Object.assign(s, scoreOpportunity(s.m, s.weakness));
    }

    const rows = scored.filter((s) => s.m.searchVolume > 0).map((s) => ({
      user_id: user.id,
      niche: s.niche,
      city: s.city,
      keyword: s.keyword,
      search_volume: s.m.searchVolume,
      competition: Math.round(s.m.competitionIndex),
      cpc: s.m.cpc,
      est_revenue: s.estRevenue,
      score: s.score,
      serp_weakness: s.weakness,
      source: 'scan',
    }));
    if (rows.length) {
      const { error } = await supabase.from('rr_opportunities').upsert(rows, { onConflict: 'user_id,niche,city', ignoreDuplicates: true });
      if (error) throw new HttpError(500, error.message);
    }
    await supabase.from('rr_scan_runs').update({ status: 'done', inserted: rows.length, cost_micro: cost, finished_at: new Date().toISOString() })
      .eq('id', run?.id);
    return json({ scanned: todo.length, inserted: rows.length, costMicro: cost });
  } catch (e) {
    await supabase.from('rr_scan_runs').update({
      status: 'failed',
      cost_micro: cost,
      error: e instanceof Error ? e.message : String(e),
      finished_at: new Date().toISOString(),
    }).eq('id', run?.id);
    throw e;
  }
}));
