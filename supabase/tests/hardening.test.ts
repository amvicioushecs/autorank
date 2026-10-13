// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { freshDb, as, A, B } from './db';

const asService = async <T>(db: Awaited<ReturnType<typeof freshDb>>, fn: () => Promise<T>) => {
  await db.exec('set role service_role');
  try { return await fn(); } finally { await db.exec('reset role'); }
};

describe('treg spend ledger', () => {
  it('users cannot write the ledger (no forged or negative costs)', async () => {
    const db = await freshDb();
    await expect(as(db, A, () => db.query(`insert into rr_treg_usage (endpoint, cost_micro) values ('x', -999999)`))).rejects.toThrow(/permission denied/);
    await expect(as(db, A, () => db.query(`select rr_treg_reserve('${A}', 'x', 1, 10)`))).rejects.toThrow(/permission denied/);
  });

  it('reserves worst-case cost, refuses past budget, and settles the real cost', async () => {
    const db = await freshDb();
    const r1 = await asService(db, () => db.query<{ id: string }>(`select rr_treg_reserve('${A}', 'serp', 250000, 600000) as id`));
    await asService(db, () => db.query<{ id: string }>(`select rr_treg_reserve('${A}', 'serp', 250000, 600000) as id`));
    // 500k reserved; another 250k would exceed 600k
    await expect(asService(db, () => db.query(`select rr_treg_reserve('${A}', 'serp', 250000, 600000)`))).rejects.toThrow(/treg_budget_exceeded/);
    // B has its own budget
    await asService(db, () => db.query(`select rr_treg_reserve('${B}', 'serp', 250000, 600000)`));
    // Settling the first call at its real (small) cost frees headroom
    await asService(db, () => db.query(`select rr_treg_settle($1, 150, 'call_1', 200)`, [r1.rows[0].id]));
    await asService(db, () => db.query(`select rr_treg_reserve('${A}', 'serp', 250000, 600000)`));
    const mine = await as(db, A, () => db.query<{ cost_micro: string; call_id: string | null }>(`select cost_micro, call_id from rr_treg_usage order by cost_micro`));
    expect(mine.rows.map((r) => Number(r.cost_micro))).toEqual([150, 250000, 250000]);
    expect(mine.rows[0].call_id).toBe('call_1');
  });
});

describe('lead ownership', () => {
  it('rejects leads pointing at another tenant property and never touches its counter', async () => {
    const db = await freshDb();
    const pb = await as(db, B, () => db.query<{ id: string }>(`insert into rr_properties (domain, niche, city, monthly_leads) values ('b.com','n','c', 7) returning id`));
    await expect(as(db, A, () => db.query(`insert into rr_leads (property, name, property_id) values ('b.com', 'x', '${pb.rows[0].id}')`))).rejects.toThrow(/property not found/);
    const r = await db.query<{ monthly_leads: number }>(`select monthly_leads from rr_properties where id = $1`, [pb.rows[0].id]);
    expect(r.rows[0].monthly_leads).toBe(7);
    // Own property still works and is counted
    const pa = await as(db, A, () => db.query<{ id: string }>(`insert into rr_properties (domain, niche, city) values ('a.com','n','c') returning id`));
    await as(db, A, () => db.query(`insert into rr_leads (property, name, property_id) values ('a.com', 'y', '${pa.rows[0].id}')`));
    const ra = await db.query<{ monthly_leads: number }>(`select monthly_leads from rr_properties where id = $1`, [pa.rows[0].id]);
    expect(ra.rows[0].monthly_leads).toBe(1);
  });
});

describe('stray policies', () => {
  it('drops pre-existing permissive policies on rr_* tables', async () => {
    const db = await freshDb();
    // Simulate a pre-existing dashboard-created policy that would leak every row
    await db.exec(`create policy "Enable read access for all users" on rr_properties for select using (true)`);
    await db.exec(readFileSync(join(__dirname, '../migrations/20261019000000_hardening.sql'), 'utf8'));
    const r = await db.query<{ policyname: string }>(`select policyname from pg_policies where tablename = 'rr_properties'`);
    expect(r.rows.map((x) => x.policyname)).toEqual(['rr_properties_owner']);
  });
});
