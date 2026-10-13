// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { parseLeadInput, validateLead, leadQuality, twilioSignature, timingSafeEqual, escapeXml, leadEmail } from '../functions/_shared/leads.ts';
import { freshDb, as, A } from './db';

const good = { site_key: 'a'.repeat(32), name: 'Marcus T', phone: '(704) 555-0100', email: 'm@x.com', service: 'Emergency Repair', message: 'burst pipe', company: '' };

describe('lead helpers', () => {
  it('parses, trims and validates', () => {
    const l = parseLeadInput({ ...good, name: '  Marcus T  ', email: '' });
    expect(l.name).toBe('Marcus T');
    expect(l.email).toBeNull();
    expect(validateLead(l)).toBeNull();
    expect(validateLead(parseLeadInput({ ...good, phone: '123' }))).toMatch(/phone/);
    expect(validateLead(parseLeadInput({ ...good, site_key: 'nope' }))).toBe('Unknown site');
    expect(validateLead(parseLeadInput({ ...good, email: 'bad' }))).toMatch(/email/);
    expect(parseLeadInput({ ...good, company: 'spam inc' }).honeypot).toBe('spam inc');
  });
  it('grades lead quality', () => {
    expect(leadQuality({ service: 'Repair', message: 'water heater burst!', email: null })).toBe('high');
    expect(leadQuality({ service: 'Repair', message: null, email: 'a@b.co' })).toBe('medium');
    expect(leadQuality({ service: 'Repair', message: null, email: null })).toBe('low');
  });
  it('computes the Twilio signature exactly like Twilio (HMAC-SHA1 over url + sorted params)', async () => {
    const url = 'https://x.supabase.co/functions/v1/twilio-voice';
    const params = { To: '+17045550100', From: '+15555550123', CallSid: 'CA1' };
    const expected = createHmac('sha1', 'secret').update(url + 'CallSidCA1From+15555550123To+17045550100').digest('base64');
    expect(await twilioSignature(url, params, 'secret')).toBe(expected);
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });
  it('escapes TwiML and builds the forward email', () => {
    expect(escapeXml('<Dial>&"')).toBe('&lt;Dial&gt;&amp;&quot;');
    const e = leadEmail({ domain: 'a.com', name: 'M', phone: '1', email: null, service: 'Repair', message: 'hi' });
    expect(e.subject).toBe('New lead from a.com: Repair');
    expect(e.text).toContain('Phone: 1');
  });
});

describe('leads schema', () => {
  it('keeps monthly_leads in sync with inserted leads', async () => {
    const db = await freshDb();
    const p = await as(db, A, () => db.query<{ id: string }>(`insert into rr_properties (domain, niche, city) values ('a.com','n','c') returning id`));
    const id = p.rows[0].id;
    await as(db, A, () => db.exec(`insert into rr_leads (property_id, property, name) values ('${id}','a.com','x'), ('${id}','a.com','y')`));
    await db.exec(`insert into rr_leads (user_id, property_id, property, name, created_at) values ('${A}', '${id}', 'a.com', 'old', now() - interval '40 days')`);
    const r = await db.query<{ monthly_leads: number }>(`select monthly_leads from rr_properties where id = '${id}'`);
    expect(r.rows[0].monthly_leads).toBe(2);
  });
});
