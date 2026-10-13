// Supabase Edge Function: billing-checkout
// Owner creates a Stripe Checkout link (monthly subscription) for renting one property to a client.
// Body: { propertyId, clientName, clientEmail, monthlyRent }  ->  { url, clientId }
// The owner sends the link to the business; the stripe-webhook marks the property rented on payment.
// Secrets: STRIPE_SECRET_KEY, APP_URL (dashboard origin for success/cancel redirects).
import { handle, HttpError, json, requireUser, serviceClient } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe.ts';

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const { supabase, user } = await requireUser(req);
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
  if (!appUrl) throw new HttpError(500, 'APP_URL not configured');
  const b = await req.json().catch(() => ({})) as { propertyId?: string; clientName?: string; clientEmail?: string; monthlyRent?: number };
  const rent = Math.round(Number(b.monthlyRent));
  const name = (b.clientName ?? '').trim();
  const email = (b.clientEmail ?? '').trim().toLowerCase();
  if (!b.propertyId || name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'propertyId, clientName and a valid clientEmail are required');
  if (!Number.isFinite(rent) || rent < 50 || rent > 50000) throw new HttpError(400, 'monthlyRent must be between 50 and 50000 USD');

  const { data: prop, error } = await supabase.from('rr_properties').select('id, domain, client_id, stripe_subscription_id, billing_status')
    .eq('id', b.propertyId).eq('user_id', user.id).single();
  if (error || !prop) throw new HttpError(404, 'Property not found');
  if (prop.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(prop.billing_status ?? '')) {
    throw new HttpError(409, 'This property already has an active subscription');
  }

  // Find or create the client, then its Stripe customer.
  let { data: client } = await supabase.from('rr_clients').select('id, stripe_customer_id').eq('user_id', user.id).eq('email', email).maybeSingle();
  if (!client) {
    const ins = await supabase.from('rr_clients').insert({ user_id: user.id, name, email }).select('id, stripe_customer_id').single();
    if (ins.error) throw new HttpError(500, ins.error.message);
    client = ins.data;
  }
  let customerId = client!.stripe_customer_id as string | null;
  if (!customerId) {
    const c = await stripe<{ id: string }>('customers', { name, email, metadata: { autorank_user_id: user.id, autorank_client_id: client!.id } });
    customerId = c.id;
    // Owners cannot write stripe_customer_id (column grant); only the server can.
    const { error: custErr } = await serviceClient().from('rr_clients').update({ stripe_customer_id: customerId }).eq('id', client!.id).eq('user_id', user.id);
    if (custErr) throw new HttpError(500, custErr.message);
  }

  const meta = { autorank_user_id: user.id, autorank_property_id: prop.id, autorank_client_id: client!.id, client_name: name };
  const idem = `checkout-${prop.id}-${client!.id}-${rent}-${new Date().toISOString().slice(0, 10)}`;
  const session = await stripe<{ url: string; id: string }>('checkout/sessions', {
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: rent * 100,
        recurring: { interval: 'month' },
        product_data: { name: `Exclusive leads: ${prop.domain}` },
      },
    }],
    metadata: meta,
    subscription_data: { metadata: meta },
    // One pending checkout per property per day+rent; repeated clicks reuse the same session.
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`,
  }, 'POST', idem);
  await supabase.from('rr_properties').update({ status: 'leasing', billing_status: 'checkout_sent' }).eq('id', prop.id).eq('user_id', user.id);
  return json({ url: session.url, clientId: client!.id });
}));
