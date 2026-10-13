// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { combos, comboKey, serpWeakness, scoreOpportunity, mapKeywordRow, domainCandidates, keywordFor } from '../functions/_shared/discovery.ts';
import { freshDb, as, A, B } from './db';

describe('discovery logic', () => {
  it('builds unique keyword combos and skips existing ones', () => {
    const out = combos(['Roofing', 'roofing ', 'HVAC'], ['Austin, TX', 'Mesa, AZ'], new Set([comboKey('HVAC', 'Mesa, AZ')]));
    expect(out.map((c) => c.keyword)).toEqual(['roofing austin', 'roofing mesa', 'hvac austin']);
    expect(keywordFor('Garage  Door Repair', 'Charlotte, NC')).toBe('garage door repair charlotte');
  });

  it('measures SERP weakness as directory share of the top 10', () => {
    const rows = [
      { link: 'https://www.yelp.com/x' }, { url: 'https://m.yelp.com/y' }, { domain: 'angi.com' },
      { link: 'https://acmeroofing.com' }, { link: 'not a url' },
    ];
    expect(serpWeakness(rows)).toBe(60);
    expect(serpWeakness([])).toBe(50);
  });

  it('scores higher when page one is weak', () => {
    const m = { keyword: 'k', searchVolume: 1500, cpc: 25, competitionIndex: 40 };
    expect(scoreOpportunity(m, 90).score).toBeGreaterThan(scoreOpportunity(m, 0).score);
    expect(scoreOpportunity({ ...m, searchVolume: 99999, cpc: 999, competitionIndex: 0 }, 100).score).toBe(99);
  });

  it('maps provider-native keyword rows', () => {
    expect(mapKeywordRow({ keyword: 'Roofing Mesa', search_volume: '880', cpc: '14.2', competition: 0.3 }))
      .toEqual({ keyword: 'roofing mesa', searchVolume: 880, cpc: 14.2, competitionIndex: 30 });
  });

  it('suggests clean .com candidates', () => {
    const d = domainCandidates('Garage Door Repair', 'St. Louis, MO');
    expect(d[0]).toBe('stlouisgaragedoorrepair.com');
    expect(new Set(d).size).toBe(d.length);
  });
});

describe('discovery schema', () => {
  it('isolates seeds per user, de-dupes case-insensitively, and enforces one opportunity per combo', async () => {
    const db = await freshDb();
    await as(db, A, () => db.exec(`insert into rr_discovery_seeds (kind, value) values ('niche', 'Roofing'), ('city', 'Mesa, AZ')`));
    await expect(as(db, A, () => db.exec(`insert into rr_discovery_seeds (kind, value) values ('niche', 'roofing')`))).rejects.toThrow(/duplicate/);
    const seen = await as(db, B, () => db.query('select * from rr_discovery_seeds'));
    expect(seen.rows).toHaveLength(0);
    await as(db, A, () => db.exec(`insert into rr_opportunities (niche, city) values ('Roofing', 'Mesa, AZ')`));
    await expect(as(db, A, () => db.exec(`insert into rr_opportunities (niche, city) values ('Roofing', 'Mesa, AZ')`))).rejects.toThrow(/duplicate/);
  });
});
