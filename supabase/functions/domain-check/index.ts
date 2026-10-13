// Supabase Edge Function: domain-check
// Checks .com availability via public RDAP (no API key). 404 from the registry = not registered.
// Body: { domains: string[] } (max 10)  ->  { results: [{ domain, available: boolean | null }] }
import { handle, HttpError, json, requireUser } from '../_shared/http.ts';

const RDAP = 'https://rdap.verisign.com/com/v1/domain/';

async function check(domain: string): Promise<boolean | null> {
  if (!/^[a-z0-9-]{1,63}\.com$/.test(domain)) return null;
  try {
    const r = await fetch(RDAP + domain, { headers: { Accept: 'application/rdap+json' } });
    if (r.status === 404) return true;
    if (r.ok) return false;
    return null;
  } catch {
    return null;
  }
}

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  await requireUser(req);
  const { domains } = await req.json().catch(() => ({})) as { domains?: string[] };
  if (!Array.isArray(domains) || !domains.length) throw new HttpError(400, 'domains[] required');
  const list = [...new Set(domains.map((d) => String(d).toLowerCase().trim()))].slice(0, 10);
  const results = await Promise.all(list.map(async (domain) => ({ domain, available: await check(domain) })));
  return json({ results });
}));
