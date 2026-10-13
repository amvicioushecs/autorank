// Pure discovery logic shared by the discovery-scan edge function and unit tests (no Deno/Node APIs).

export interface KeywordRow {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competitionIndex: number; // 0-100
}

export interface SerpRow {
  link?: string;
  url?: string;
  domain?: string;
}

/** Aggregators/directories. When they dominate page one, a focused local site can outrank them. */
export const DIRECTORY_DOMAINS = [
  'yelp.com', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com', 'bbb.org', 'yellowpages.com',
  'facebook.com', 'nextdoor.com', 'houzz.com', 'porch.com', 'mapquest.com', 'manta.com', 'superpages.com',
  'expertise.com', 'threebestrated.com', 'reddit.com', 'groupon.com', 'nerdwallet.com', 'forbes.com',
];

export const normalizeCity = (city: string) => city.split(',')[0].trim();

export const keywordFor = (niche: string, city: string) => `${niche} ${normalizeCity(city)}`.toLowerCase().replace(/\s+/g, ' ').trim();

export function combos(niches: string[], cities: string[], existing: Set<string> = new Set()): { niche: string; city: string; keyword: string }[] {
  const out: { niche: string; city: string; keyword: string }[] = [];
  const seen = new Set<string>();
  for (const niche of niches) {
    for (const city of cities) {
      const key = comboKey(niche, city);
      if (existing.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push({ niche: niche.trim(), city: city.trim(), keyword: keywordFor(niche, city) });
    }
  }
  return out;
}

export const comboKey = (niche: string, city: string) => `${niche.trim().toLowerCase()}|${city.trim().toLowerCase()}`;

export function hostOf(r: SerpRow): string {
  if (r.domain) return r.domain.replace(/^www\./, '').toLowerCase();
  const link = r.link || r.url || '';
  try {
    return new URL(link).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** 0-100: share of the top 10 organic results held by directories/aggregators (higher = easier). */
export function serpWeakness(results: SerpRow[]): number {
  const top = results.slice(0, 10);
  if (top.length === 0) return 50;
  const weak = top.filter((r) => {
    const h = hostOf(r);
    return DIRECTORY_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
  }).length;
  return Math.round((weak / top.length) * 100);
}

/** 0-99 opportunity score: demand, commercial intent (CPC), ad competition and SERP weakness. */
export function scoreOpportunity(m: KeywordRow, weakness: number | null = null): { score: number; estRevenue: number } {
  const vol = Math.min(m.searchVolume / 2000, 1);
  const cpc = Math.min(m.cpc / 60, 1);
  const ease = 1 - Math.min(m.competitionIndex / 100, 1);
  const base = weakness === null
    ? vol * 0.3 + cpc * 0.35 + ease * 0.35
    : vol * 0.25 + cpc * 0.3 + ease * 0.2 + (weakness / 100) * 0.25;
  const score = Math.min(Math.round(40 + base * 60), 99);
  const estRevenue = Math.round((m.searchVolume * 0.03 * Math.max(m.cpc, 5) * 0.6) / 50) * 50;
  return { score, estRevenue: Math.max(estRevenue, 300) };
}

/** Map a provider-native treg keyword row to KeywordRow. */
export function mapKeywordRow(r: Record<string, unknown>): KeywordRow {
  const comp = r.competition;
  return {
    keyword: String(r.keyword ?? '').toLowerCase(),
    searchVolume: Number(r.search_volume ?? r.searchVolume ?? 0) || 0,
    cpc: Number(r.cpc ?? 0) || 0,
    competitionIndex: Number(r.competition_index ?? (typeof comp === 'number' ? comp * 100 : 50)) || 0,
  };
}

/** Candidate .com names for a niche+city, most natural first. */
export function domainCandidates(niche: string, city: string): string[] {
  const c = normalizeCity(city).toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bases = [`${c}${n}`, `${c}${n}pros`, `${n}${c}`, `${c}${n}co`, `best${c}${n}`];
  return [...new Set(bases.map((b) => `${b.slice(0, 56)}.com`))];
}
