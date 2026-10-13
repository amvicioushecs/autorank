import { supabase } from '@/lib/supabase';
import { ownerId } from '@/lib/rrApi';
import { invokeFn } from '@/lib/invokeFn';

export type SeedKind = 'niche' | 'city';
export interface Seed { id: string; kind: SeedKind; value: string }
export interface ScanResult { scanned: number; inserted: number; costMicro: number; message?: string }
export interface DomainAvailability { domain: string; available: boolean | null }

const invoke = invokeFn;

export async function listSeeds(): Promise<Seed[]> {
  const uid = await ownerId();
  const { data, error } = await supabase.from('rr_discovery_seeds').select('id, kind, value').eq('user_id', uid).order('created_at');
  if (error) throw error;
  return (data ?? []) as Seed[];
}

export async function addSeeds(kind: SeedKind, raw: string): Promise<Seed[]> {
  const uid = await ownerId();
  const values = parseSeedInput(raw);
  if (!values.length) return [];
  const added: Seed[] = [];
  for (const value of values) {
    const { data, error } = await supabase.from('rr_discovery_seeds').insert({ user_id: uid, kind, value }).select('id, kind, value').single();
    if (error) {
      if ((error as { code?: string }).code === '23505') continue; // already present (case-insensitive)
      throw error;
    }
    added.push(data as Seed);
  }
  return added;
}

export async function removeSeed(id: string): Promise<void> {
  const uid = await ownerId();
  const { error } = await supabase.from('rr_discovery_seeds').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

/** Split on newlines or semicolons (cities contain commas, e.g. "Austin, TX"). */
export function parseSeedInput(raw: string): string[] {
  return [...new Set(raw.split(/[\n;]+/).map((s) => s.trim().replace(/\s+/g, ' ')).filter((s) => s.length >= 2 && s.length <= 80))];
}

export const runScan = (opts: { maxCombos?: number; serpChecks?: number } = {}) => invoke<ScanResult>('discovery-scan', opts);

/** First available candidate, or the first candidate if availability can't be determined. */
export async function pickDomain(candidates: string[]): Promise<{ domain: string; verified: boolean }> {
  try {
    const results = await checkDomains(candidates);
    const free = results.find((r) => r.available === true);
    if (free) return { domain: free.domain, verified: true };
  } catch { /* fall through */ }
  return { domain: candidates[0], verified: false };
}

export const checkDomains = (domains: string[]) =>
  invoke<{ results: DomainAvailability[] }>('domain-check', { domains }).then((r) => r.results);
