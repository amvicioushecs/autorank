// Supabase Edge Function: twilio-voice (public; verify_jwt = false)
// Set as the Voice webhook (HTTP POST) of each property's Twilio tracking number. Verifies the
// X-Twilio-Signature, logs the call as a lead and forwards it to the property's forward_phone.
// Secrets: TWILIO_AUTH_TOKEN (required), PUBLIC_FUNCTIONS_URL (the externally visible base URL,
// e.g. https://<ref>.supabase.co/functions/v1, used for signature checks).
import { handle, HttpError, serviceClient } from '../_shared/http.ts';
import { digits, escapeXml, timingSafeEqual, twilioSignature } from '../_shared/leads.ts';

const twiml = (inner: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, { headers: { 'Content-Type': 'text/xml' } });

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const base = Deno.env.get('PUBLIC_FUNCTIONS_URL');
  if (!token || !base) throw new HttpError(500, 'TWILIO_AUTH_TOKEN / PUBLIC_FUNCTIONS_URL not configured');

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') params[k] = v;
  const expected = await twilioSignature(`${base.replace(/\/$/, '')}/twilio-voice`, params, token);
  if (!timingSafeEqual(expected, req.headers.get('X-Twilio-Signature') ?? '')) throw new HttpError(403, 'Bad signature');

  const db = serviceClient();
  const to = digits(params.To ?? '');
  const { data: props } = await db.from('rr_properties').select('id, user_id, domain, niche, phone, forward_phone').not('phone', 'is', null);
  const matches = to.length >= 10 ? (props ?? []).filter((p) => digits(p.phone).slice(-10) === to.slice(-10)) : [];
  if (matches.length > 1) console.error('ambiguous tracking number', to, matches.map((m) => m.id));
  // Never guess: an ambiguous number could route one tenant's caller to another tenant.
  const prop = matches.length === 1 ? matches[0] : null;
  if (!prop) return twiml('<Say>Sorry, this number is not in service.</Say><Hangup/>');

  await db.from('rr_leads').insert({
    user_id: prop.user_id,
    property_id: prop.id,
    property: prop.domain,
    niche: prop.niche,
    name: params.CallerName || params.From || 'Caller',
    phone: params.From ?? null,
    service: 'Phone call',
    quality: 'high',
    channel: 'call',
    status: prop.forward_phone ? 'forwarded' : 'new',
    forwarded_at: prop.forward_phone ? new Date().toISOString() : null,
  });

  if (!prop.forward_phone) return twiml('<Say>Thanks for calling. Please leave your name and number after the tone.</Say><Record maxLength="120"/>');
  return twiml(`<Dial timeout="25" answerOnBridge="true">${escapeXml(prop.forward_phone)}</Dial>`);
}));
