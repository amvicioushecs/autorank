// Pure lead-handling helpers (unit-tested). Uses only Web APIs available in Deno and Node 20+.

export interface LeadInput {
  siteKey: string;
  name: string;
  phone: string;
  email: string | null;
  service: string | null;
  message: string | null;
  honeypot: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseLeadInput(fields: Record<string, unknown>): LeadInput {
  return {
    siteKey: str(fields.site_key, 64),
    name: str(fields.name, 120),
    phone: str(fields.phone, 40),
    email: str(fields.email, 200) || null,
    service: str(fields.service, 120) || null,
    message: str(fields.message, 2000) || null,
    honeypot: str(fields.company, 200),
  };
}

export const digits = (s: string) => s.replace(/\D/g, '');

export function validateLead(l: LeadInput): string | null {
  if (!/^[0-9a-f]{16,64}$/i.test(l.siteKey)) return 'Unknown site';
  if (l.name.length < 2) return 'Please enter your name';
  const d = digits(l.phone);
  if (d.length < 10 || d.length > 15) return 'Please enter a valid phone number';
  if (l.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(l.email)) return 'Please enter a valid email';
  return null;
}

const URGENT = /\b(emergency|urgent|asap|today|now|leak|flood|burst|no heat|no ac|broken)\b/i;

export function leadQuality(l: Pick<LeadInput, 'email' | 'message' | 'service'>): 'high' | 'medium' | 'low' {
  const text = `${l.service ?? ''} ${l.message ?? ''}`;
  if (URGENT.test(text)) return 'high';
  if (l.email || (l.message && l.message.length > 30)) return 'medium';
  return 'low';
}

export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + concat(sorted key+value))). */
export async function twilioSignature(url: string, params: Record<string, string>, authToken: string): Promise<string> {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function leadEmail(o: { domain: string; name: string; phone: string; email: string | null; service: string | null; message: string | null }) {
  const subject = `New lead from ${o.domain}: ${o.service ?? 'service request'}`;
  const text = [
    `Name: ${o.name}`, `Phone: ${o.phone}`, o.email ? `Email: ${o.email}` : null,
    o.service ? `Service: ${o.service}` : null, o.message ? `\n${o.message}` : null,
  ].filter(Boolean).join('\n');
  return { subject, text };
}
