// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDb, as, A, B } from './db';

let db: PGlite;
let propA: string;

beforeEach(async () => {
  db = await freshDb();
  const r = await db.query<{ id: string }>(`insert into rr_properties (user_id, domain, niche, city, client, rank_position, monthly_leads)
    values ('${A}', 'a-plumber.com', 'Plumbing', 'Austin, TX', 'BlueFlow', 3, 12) returning id`);
  propA = r.rows[0].id;
  await db.exec(`insert into rr_leads (user_id, property, name, service, value, status) values
    ('${A}', 'a-plumber.com', 'Marcus', 'Burst pipe', 850, 'new'),
    ('${A}', 'other.com', 'Hidden', 'x', 1, 'new'),
    ('${B}', 'a-plumber.com', 'Not yours', 'x', 1, 'new')`);
});

const create = (uid: string | null, prop: string) =>
  as(db, uid, () => db.query<{ t: string }>(`select rr_create_portal_token($1) as t`, [prop])).then((r) => r.rows[0].t);
const view = (token: string) =>
  as(db, null, () => db.query<{ v: Record<string, unknown> | null }>(`select rr_portal_view($1) as v`, [token])).then((r) => r.rows[0].v);

describe('client portal tokens', () => {
  it('owner gets a long random token; only its hash is stored', async () => {
    const t = await create(A, propA);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    const stored = await db.query<{ token_hash: string }>('select token_hash from rr_portal_tokens');
    expect(stored.rows[0].token_hash).not.toBe(t);
  });

  it('anon can view the property and only its own leads with a valid token', async () => {
    const v = await view(await create(A, propA));
    expect(v).toMatchObject({ property: { domain: 'a-plumber.com', client: 'BlueFlow' } });
    const leads = (v as { leads: { name: string }[] }).leads;
    expect(leads.map((l) => l.name)).toEqual(['Marcus']);
  });

  it('rejects unknown, revoked and expired tokens', async () => {
    expect(await view('f'.repeat(64))).toBeNull();
    const t = await create(A, propA);
    await as(db, A, () => db.exec(`update rr_portal_tokens set revoked_at = now()`));
    expect(await view(t)).toBeNull();
    const t2 = await create(A, propA);
    await db.exec(`update rr_portal_tokens set expires_at = now() - interval '1 second' where revoked_at is null`);
    expect(await view(t2)).toBeNull();
  });

  it("users cannot mint tokens for someone else's property, nor see others' tokens", async () => {
    await expect(create(B, propA)).rejects.toThrow('Property not found');
    await expect(create(null, propA)).rejects.toThrow();
    await create(A, propA);
    const seen = await as(db, B, () => db.query('select * from rr_portal_tokens'));
    expect(seen.rows).toHaveLength(0);
  });
});
