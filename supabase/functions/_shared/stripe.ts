// Minimal Stripe helpers over fetch (no SDK) — pure parts are unit-tested.

/** Encode nested objects/arrays the way Stripe's form API expects (a[b][0][c]=v). */
export function formEncode(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === 'object') {
      parts.push(formEncode(v as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verify a Stripe-Signature header (t=...,v1=...) for the raw body. */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header) return false;
  const items = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = Number(items.find(([k]) => k === 't')?.[1]);
  const sigs = items.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => s.length === expected.length && [...s].reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

/** Stripe subscription status -> our billing_status + whether the property should stay rented. */
export function mapSubscriptionStatus(status: string): { billingStatus: string; rented: boolean } {
  switch (status) {
    case 'active':
    case 'trialing':
      return { billingStatus: status, rented: true };
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return { billingStatus: status, rented: true }; // grace period; owner decides
    default: // canceled, incomplete_expired, paused
      return { billingStatus: status, rented: false };
  }
}

export async function stripe<T = Record<string, unknown>>(path: string, params: Record<string, unknown> = {}, method = 'POST'): Promise<T> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  const body = formEncode(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}${method === 'GET' && body ? `?${body}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${data?.error?.message ?? res.status}`);
  return data as T;
}
