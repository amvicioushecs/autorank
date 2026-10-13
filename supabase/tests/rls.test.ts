// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDb, as, A, B } from './db';

let db: PGlite;
const TABLES = ['rr_properties', 'rr_opportunities', 'rr_leads', 'rr_treg_usage'];

beforeAll(async () => {
  db = await freshDb();
  for (const u of [A, B]) {
    await as(db, u, async () => {
      await db.exec(`insert into rr_properties (domain, niche, city) values ('${u.slice(-1)}.com', 'Plumbing', 'Austin, TX')`);
      await db.exec(`insert into rr_opportunities (niche, city) values ('Roofing', 'Mesa, AZ')`);
      await db.exec(`insert into rr_leads (property, name) values ('${u.slice(-1)}.com', 'Lead ${u.slice(-1)}')`);
      await db.exec(`insert into rr_treg_usage (endpoint, cost_micro) values ('treg.google.serp.organic', 150)`);
    });
  }
});

describe('row level security', () => {
  it.each(TABLES)('%s: each user sees only their own rows', async (t) => {
    const a = await as(db, A, () => db.query<{ user_id: string }>(`select user_id from ${t}`));
    expect(a.rows.length).toBe(1);
    expect(a.rows.every((r) => r.user_id === A)).toBe(true);
  });

  it.each(TABLES)('%s: anon sees nothing', async (t) => {
    await expect(as(db, null, () => db.query(`select * from ${t}`))).rejects.toThrow(/permission denied/);
  });

  it("cannot update or delete another user's rows", async () => {
    await as(db, B, async () => {
      await db.exec(`update rr_properties set mrr = 999`);
      await db.exec(`delete from rr_leads`);
    });
    const r = await db.query<{ mrr: number }>(`select mrr from rr_properties where user_id = '${A}'`);
    expect(r.rows[0].mrr).toBe(0);
    const l = await db.query(`select 1 from rr_leads where user_id = '${A}'`);
    expect(l.rows).toHaveLength(1);
  });

  it('cannot insert rows owned by someone else', async () => {
    await expect(as(db, A, () => db.exec(`insert into rr_properties (user_id, domain, niche, city) values ('${B}', 'x.com', 'n', 'c')`))).rejects.toThrow(/row-level security/);
  });

  it('usage log is append-only for users', async () => {
    await as(db, A, () => db.exec(`update rr_treg_usage set cost_micro = 0`)).catch(() => {});
    const r = await db.query<{ cost_micro: string }>(`select cost_micro from rr_treg_usage where user_id = '${A}'`);
    expect(Number(r.rows[0].cost_micro)).toBe(150);
  });

  it('enforces status values', async () => {
    await expect(as(db, A, () => db.exec(`update rr_properties set status = 'bogus'`))).rejects.toThrow(/rr_properties_status_chk/);
  });
});

describe('rr_seed_starter', () => {
  it('seeds sample opportunities once for a new user, then is a no-op', async () => {
    const C = '00000000-0000-0000-0000-00000000000c';
    const first = await as(db, C, () => db.query<{ n: number }>('select rr_seed_starter() as n'));
    expect(first.rows[0].n).toBe(5);
    const again = await as(db, C, () => db.query<{ n: number }>('select rr_seed_starter() as n'));
    expect(again.rows[0].n).toBe(0);
    const props = await db.query(`select 1 from rr_properties where user_id = '${C}'`);
    expect(props.rows).toHaveLength(0);
  });
  it('requires sign-in', async () => {
    await expect(as(db, null, () => db.query('select rr_seed_starter()'))).rejects.toThrow();
  });
});
