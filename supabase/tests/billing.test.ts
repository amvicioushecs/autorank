// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { formEncode, verifyStripeSignature, mapSubscriptionStatus } from '../functions/_shared/stripe.ts';
import { freshDb, as, A, B } from './db';

describe('stripe helpers', () => {
  it('form-encodes nested params like Stripe expects', () => {
    const s = formEncode({ mode: 'subscription', line_items: [{ quantity: 1, price_data: { recurring: { interval: 'month' } } }], skip: undefined });
    expect(decodeURIComponent(s)).toBe('mode=subscription&line_items[0][quantity]=1&line_items[0][price_data][recurring][interval]=month');
  });

  it('verifies Stripe signatures and rejects tampering / stale timestamps', async () => {
    const body = '{"id":"evt_1"}';
    const t = 1_800_000_000;
    const sig = createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex');
    expect(await verifyStripeSignature(body, `t=${t},v1=${sig}`, 'whsec_test', 300, t + 10)).toBe(true);
    expect(await verifyStripeSignature(body + ' ', `t=${t},v1=${sig}`, 'whsec_test', 300, t + 10)).toBe(false);
    expect(await verifyStripeSignature(body, `t=${t},v1=${sig}`, 'whsec_test', 300, t + 1000)).toBe(false);
    expect(await verifyStripeSignature(body, null, 'whsec_test')).toBe(false);
  });

  it('maps subscription states', () => {
    expect(mapSubscriptionStatus('active')).toEqual({ billingStatus: 'active', rented: true });
    expect(mapSubscriptionStatus('past_due').rented).toBe(true);
    expect(mapSubscriptionStatus('canceled').rented).toBe(false);
  });
});

describe('billing schema', () => {
  it('isolates clients, hides billing events, and exposes billing info only via portal token', async () => {
    const db = await freshDb();
    const c = await as(db, A, () => db.query<{ id: string }>(`insert into rr_clients (name, email, stripe_customer_id) values ('Acme', 'a@acme.com', 'cus_1') returning id`));
    const p = await as(db, A, () => db.query<{ id: string }>(`insert into rr_properties (domain, niche, city, client_id, mrr, billing_status) values ('a.com','n','c','${c.rows[0].id}', 900, 'active') returning id`));
    expect((await as(db, B, () => db.query('select * from rr_clients'))).rows).toHaveLength(0);
    await expect(as(db, A, () => db.query('select * from rr_billing_events'))).rejects.toThrow(/permission denied/);

    const tok = await as(db, A, () => db.query<{ t: string }>(`select rr_create_portal_token('${p.rows[0].id}') as t`));
    const v = await as(db, null, () => db.query<{ v: { property: Record<string, unknown> } }>(`select rr_portal_view($1) as v`, [tok.rows[0].t]));
    expect(v.rows[0].v.property).toMatchObject({ mrr: 900, billingStatus: 'active', hasBilling: true });
    expect(JSON.stringify(v.rows[0].v)).not.toContain('cus_1');

    await expect(as(db, null, () => db.query(`select rr_portal_customer($1)`, [tok.rows[0].t]))).rejects.toThrow(/permission denied/);
    const cust = await db.query<{ c: string }>(`select rr_portal_customer($1) as c`, [tok.rows[0].t]);
    expect(cust.rows[0].c).toBe('cus_1');
  });
});
