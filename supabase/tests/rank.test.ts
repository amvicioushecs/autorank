// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { detectAlert, findPosition, healthScore, nextTrend, notFoundPosition, rankChange } from '../functions/_shared/rank.ts';
import { freshDb, as, A, B } from './db';

describe('rank logic', () => {
  it('finds the domain position, including www and subdomains', () => {
    const rows = [{ link: 'https://yelp.com/x' }, { url: 'https://www.mysite.com/a' }, { link: 'https://other.com' }];
    expect(findPosition(rows, 'mysite.com')).toBe(2);
    expect(findPosition([{ link: 'https://blog.mysite.com', position: 7 }], 'mysite.com')).toBe(7);
    expect(findPosition([{ link: 'https://notmysite.com' }], 'mysite.com')).toBeNull();
  });
  it('keeps a bounded trend and computes change (negative = improved)', () => {
    expect(nextTrend([1, 2, 'x', 3], 4, 3)).toEqual([2, 3, 4]);
    expect(nextTrend(null, 9)).toEqual([9]);
    expect(rankChange(10, 7)).toBe(-3);
    expect(rankChange(null, 7)).toBe(0);
    expect(notFoundPosition(50)).toBe(51);
  });
  it('scores health from rank, deployment and leads', () => {
    expect(healthScore({ position: 1, depth: 50, deployed: true, monthlyLeads: 30 })).toBe(100);
    expect(healthScore({ position: 51, depth: 50, deployed: false, monthlyLeads: 0 })).toBe(0);
    expect(healthScore({ position: 10, depth: 50, deployed: true, monthlyLeads: 0 })).toBeLessThan(healthScore({ position: 2, depth: 50, deployed: true, monthlyLeads: 0 }));
  });
  it('raises alerts on drops, falling off, and entering the top 3', () => {
    expect(detectAlert(4, 8, 50)?.kind).toBe('rank_drop');
    expect(detectAlert(20, 51, 50)?.kind).toBe('fell_off');
    expect(detectAlert(6, 3, 50)?.kind).toBe('entered_top3');
    expect(detectAlert(5, 6, 50)).toBeNull();
    expect(detectAlert(null, 6, 50)).toBeNull();
  });
});

describe('rank schema', () => {
  it('isolates rank checks and alerts per user', async () => {
    const db = await freshDb();
    const p = await as(db, A, () => db.query<{ id: string }>(`insert into rr_properties (domain, niche, city) values ('a.com','n','c') returning id`));
    await as(db, A, () => db.exec(`insert into rr_rank_checks (property_id, keyword, position) values ('${p.rows[0].id}', 'k', 4);
      insert into rr_alerts (property_id, kind, message) values ('${p.rows[0].id}', 'rank_drop', 'm')`));
    for (const t of ['rr_rank_checks', 'rr_alerts']) {
      expect((await as(db, B, () => db.query(`select * from ${t}`))).rows).toHaveLength(0);
      expect((await as(db, A, () => db.query(`select * from ${t}`))).rows).toHaveLength(1);
    }
  });
});
