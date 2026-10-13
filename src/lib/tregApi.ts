import { supabase } from '@/lib/supabase';
import { ownerId } from '@/lib/rrApi';
import { scoreOpportunity as scoreShared } from '../../supabase/functions/_shared/discovery.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface KeywordMetric {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: string; // LOW | MEDIUM | HIGH
  competitionIndex: number; // 0-100
  monthly: number[]; // oldest -> newest
}

export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

export interface TregMeta {
  callId: string | null;
  costMicro: number;
  servedBy: string | null;
}

async function callTreg(endpoint: string, body: unknown): Promise<{ data: Json } & TregMeta> {
  const { data, error } = await supabase.functions.invoke('treg-proxy', { body: { endpoint, body } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as Json).context;
      if (ctx?.json) { const j = await ctx.json(); msg = j.error || msg; }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Live Google keyword volume, CPC & competition via treg (routed: best provider). */
export async function fetchKeywordMetrics(keywords: string[], country = 'us'): Promise<{ rows: KeywordMetric[] } & TregMeta> {
  const res = await callTreg('treg.google.keywords.volume', { keywords, country, language: 'en' });
  const rows = (res.data?.output?.rows || []).map((r: Json): KeywordMetric => ({
    keyword: r.keyword,
    searchVolume: Number(r.search_volume ?? r.searchVolume ?? 0) || 0,
    cpc: Number(r.cpc ?? 0) || 0,
    competition: String(r.competition ?? 'UNKNOWN'),
    competitionIndex: Number(r.competition_index ?? (typeof r.competition === 'number' ? r.competition * 100 : 50)) || 0,
    monthly: Array.isArray(r.monthly_searches)
      ? [...r.monthly_searches].reverse().map((m: Json) => Number(m.search_volume) || 0)
      : [],
  }));
  return { rows, callId: res.callId, costMicro: res.costMicro, servedBy: res.servedBy };
}

/** Live Google organic SERP for a keyword via treg. */
export async function fetchSerp(q: string, limit = 10, country = 'us'): Promise<{ results: SerpResult[] } & TregMeta> {
  const res = await callTreg('treg.google.serp.organic', { q, country, language: 'en', limit });
  const results = (res.data?.output?.results || []).slice(0, limit).map((r: Json, i: number): SerpResult => {
    const link = r.link || r.url || '';
    let domain = '';
    try { domain = new URL(link).hostname.replace(/^www\./, ''); } catch { domain = link; }
    return { position: Number(r.position ?? r.rank_absolute ?? i + 1), title: r.title || link, link, snippet: r.snippet || r.description || '', domain };
  });
  return { results, callId: res.callId, costMicro: res.costMicro, servedBy: res.servedBy };
}

export interface UsageRow { id: string; endpoint: string; costMicro: number; callId: string | null; status: number | null; createdAt: string }

export async function fetchTregUsage(limit = 50): Promise<UsageRow[]> {
  const uid = await ownerId();
  const { data, error } = await supabase
    .from('rr_treg_usage')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r: Json) => ({ id: r.id, endpoint: r.endpoint, costMicro: Number(r.cost_micro) || 0, callId: r.call_id, status: r.status, createdAt: r.created_at }));
}

/** Turn keyword metrics into a 0-100 Rank & Rent opportunity score (shared with the discovery-scan function). */
export function scoreOpportunity(m: KeywordMetric, serpWeakness: number | null = null): { score: number; estRevenue: number } {
  return scoreShared(m, serpWeakness);
}

export const microToUsd = (m: number) => `$${(m / 1_000_000).toFixed(m < 10000 ? 4 : 3)}`;
