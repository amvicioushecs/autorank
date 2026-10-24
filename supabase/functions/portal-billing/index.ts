// Supabase Edge Function: portal-billing (public; verify_jwt = false)
// A client with a valid portal token gets a Stripe Billing Portal session (invoices, card updates,
// cancellation) for their own Stripe customer. Body: { token, returnUrl }  ->  { url }
// Secrets: STRIPE_SECRET_KEY, APP_URL.
import { handle, HttpError, json, serviceClient } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe.ts';

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const { token } = await req.json().catch(() => ({})) as { token?: string };
  if (!token || token.length < 32) throw new HttpError(400, 'token required');
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
  if (!appUrl) throw new HttpError(500, 'APP_URL not configured');
  const { data: customer, error } = await serviceClient().rpc('rr_portal_customer', { p_token: token });
  if (error) throw new HttpError(500, error.message);
  if (!customer) throw new HttpError(404, 'No billing account for this link');
  const session = await stripe<{ url: string }>('billing_portal/sessions', { customer, return_url: `${appUrl}/portal/${token}` });
  return json({ url: session.url });
}));
