// Pure rank-tracking logic (unit-tested).
import { hostOf, type SerpRow } from './discovery.ts';

export interface RankedRow extends SerpRow {
  position?: number;
  rank_absolute?: number;
}

/** 1-based organic position of `domain` (or any subdomain) in results, or null if absent. */
export function findPosition(results: RankedRow[], domain: string): number | null {
  const d = domain.replace(/^www\./, '').toLowerCase();
  for (let i = 0; i < results.length; i++) {
    const h = hostOf(results[i]);
    if (h === d || h.endsWith(`.${d}`)) return Number(results[i].position ?? results[i].rank_absolute ?? i + 1);
  }
  return null;
}

/** Positions are stored as numbers; "not found in top N" is stored as N + 1 so trends stay plottable. */
export const notFoundPosition = (depth: number) => depth + 1;

export function nextTrend(trend: unknown, position: number, keep = 12): number[] {
  const prev = Array.isArray(trend) ? trend.map(Number).filter((n) => Number.isFinite(n)) : [];
  return [...prev, position].slice(-keep);
}

/** Negative = improved (moved up), matching the UI's existing convention. */
export const rankChange = (prev: number | null | undefined, curr: number) => (prev == null ? 0 : curr - prev);

/** 0-100 health from ranking, deployment and lead flow. */
export function healthScore(o: { position: number; depth: number; deployed: boolean; monthlyLeads: number }): number {
  const rank = o.position > o.depth ? 0 : 1 - (o.position - 1) / o.depth; // 1 at #1, ~0 at depth
  const leads = Math.min(o.monthlyLeads / 30, 1);
  const score = 20 * (o.deployed ? 1 : 0) + 55 * rank + 25 * leads;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type AlertKind = 'rank_drop' | 'fell_off' | 'entered_top3';

export function detectAlert(prev: number | null | undefined, curr: number, depth: number): { kind: AlertKind; message: string } | null {
  if (prev == null) return null;
  if (prev <= depth && curr > depth) return { kind: 'fell_off', message: `Dropped out of the top ${depth} (was #${prev})` };
  if (curr - prev >= 3 && curr <= depth) return { kind: 'rank_drop', message: `Fell ${curr - prev} spots: #${prev} → #${curr}` };
  if (prev > 3 && curr <= 3) return { kind: 'entered_top3', message: `Entered the top 3: #${prev} → #${curr}` };
  return null;
}
