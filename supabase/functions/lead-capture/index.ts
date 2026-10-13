// Supabase Edge Function: lead-capture (public; verify_jwt = false)
// Receives lead form posts from deployed sites (form-encoded or JSON), identified by the property's
// public site_key. Stores the lead under the property owner, forwards it by email when the property
// has forward_email and RESEND_API_KEY is set, then redirects browsers to https://<domain>/thanks/.
// Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), optional RESEND_API_KEY + LEAD_FROM_EMAIL.
import { cors, handle, HttpError, json, serviceClient } from '../_shared/http.ts';
import { leadEmail, leadQuality, parseLeadInput, validateLead } from '../_shared/leads.ts';

async function readFields(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return await req.json().catch(() => ({}));
  const form = await req.formData().catch(() => null);
  return form ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : ''])) : {};
}

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const wantsHtml = !(req.headers.get('content-type') ?? '').includes('application/json');
  const input = parseLeadInput(await readFields(req));
  const db = serviceClient();

  const { data: prop } = await db.from('rr_properties')
    .select('id, user_id, domain, niche, forward_email')
    .eq('site_key', input.siteKey).maybeSingle();
  const thanks = prop ? `https://${prop.domain}/thanks/` : null;
  const done = (body: Record<string, unknown>, status = 200) =>
    wantsHtml && thanks && status < 400
      ? new Response(null, { status: 303, headers: { ...cors, Location: thanks } })
      : json(body, status);

  // Bots fill the hidden field: pretend success, store nothing.
  if (input.honeypot) return done({ ok: true });
  const invalid = !prop ? 'Unknown site' : validateLead(input);
  if (invalid) return json({ error: invalid }, 400);

  // Basic abuse guard: max 5 leads per phone per property per hour.
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await db.from('rr_leads').select('id', { count: 'exact', head: true })
    .eq('property_id', prop!.id).eq('phone', input.phone).gte('created_at', since);
  if ((count ?? 0) >= 5) return done({ ok: true, throttled: true });

  const { data: lead, error } = await db.from('rr_leads').insert({
    user_id: prop!.user_id,
    property_id: prop!.id,
    property: prop!.domain,
    niche: prop!.niche,
    name: input.name,
    phone: input.phone,
    email: input.email,
    service: input.service,
    message: input.message,
    quality: leadQuality(input),
    channel: 'form',
    status: 'new',
  }).select('id').single();
  if (error) throw new HttpError(500, error.message);

  const resend = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('LEAD_FROM_EMAIL');
  if (resend && from && prop!.forward_email) {
    const { subject, text } = leadEmail({ domain: prop!.domain, ...input });
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [prop!.forward_email], subject, text, reply_to: input.email ?? undefined }),
    });
    if (r.ok) {
      await db.from('rr_leads').update({ status: 'forwarded', forwarded_at: new Date().toISOString() }).eq('id', lead.id);
    } else {
      console.warn('lead forward failed', r.status, await r.text());
    }
  }
  return done({ ok: true, id: lead.id });
}));
