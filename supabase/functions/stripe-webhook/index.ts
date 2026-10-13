// Supabase Edge Function: stripe-webhook (public; verify_jwt = false)
// Verifies Stripe-Signature, processes each event once (rr_billing_events), and keeps properties in
// sync with subscriptions. Events: checkout.session.completed, customer.subscription.updated|deleted,
// invoice.payment_failed. Secrets: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY.
import { handle, HttpError, json, serviceClient } from '../_shared/http.ts';
import { mapSubscriptionStatus, stripe, verifyStripeSignature } from '../_shared/stripe.ts';

type Meta = { autorank_user_id?: string; autorank_property_id?: string; autorank_client_id?: string; client_name?: string };

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new HttpError(500, 'STRIPE_WEBHOOK_SECRET not configured');
  const raw = await req.text();
  if (!(await verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), secret))) throw new HttpError(400, 'Bad signature');

  const event = JSON.parse(raw) as { id: string; type: string; data: { object: Record<string, unknown> } };
  const obj = event.data.object;
  const db = serviceClient();

  const meta = ((obj.metadata ?? (obj as { subscription_details?: { metadata?: Meta } }).subscription_details?.metadata) ?? {}) as Meta;
  // Already processed? (Recorded only after successful handling, so failed attempts are retried by Stripe.)
  const { data: seen } = await db.from('rr_billing_events').select('stripe_event_id').eq('stripe_event_id', event.id).maybeSingle();
  if (seen) return json({ received: true, duplicate: true });

  const uid = meta.autorank_user_id;
  const pid = meta.autorank_property_id;
  const scoped = () => db.from('rr_properties');

  switch (event.type) {
    case 'checkout.session.completed': {
      if (!uid || !pid || obj.mode !== 'subscription') break;
      const subId = String(obj.subscription);
      const sub = await stripe<{ status: string; items: { data: { price: { unit_amount: number } }[] } }>(`subscriptions/${subId}`, {}, 'GET');
      const mrr = Math.round((sub.items?.data?.[0]?.price?.unit_amount ?? 0) / 100);
      const { rented, billingStatus } = mapSubscriptionStatus(sub.status);
      await scoped().update({
        client_id: meta.autorank_client_id ?? null,
        client: meta.client_name ?? null,
        stripe_subscription_id: subId,
        billing_status: billingStatus,
        mrr: rented ? mrr : 0,
        status: rented ? 'rented' : 'leasing',
      }).eq('id', pid).eq('user_id', uid);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subId = String(obj.id);
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(obj.status);
      const { rented, billingStatus } = mapSubscriptionStatus(status);
      const { data: props } = await scoped().select('id, user_id, domain').eq('stripe_subscription_id', subId);
      for (const p of props ?? []) {
        const patch: Record<string, unknown> = { billing_status: billingStatus };
        if (!rented) Object.assign(patch, { status: 'ranking', client: null, client_id: null, mrr: 0, stripe_subscription_id: null });
        await scoped().update(patch).eq('id', p.id).eq('user_id', p.user_id);
        if (!rented) await db.from('rr_alerts').insert({ user_id: p.user_id, property_id: p.id, kind: 'churn', message: `${p.domain}: subscription ${status}; site is available to re-rent` });
      }
      break;
    }
    case 'invoice.payment_failed': {
      const subId = String(obj.subscription ?? '');
      if (!subId) break;
      const { data: props } = await scoped().select('id, user_id, domain').eq('stripe_subscription_id', subId);
      for (const p of props ?? []) {
        await scoped().update({ billing_status: 'past_due' }).eq('id', p.id).eq('user_id', p.user_id);
        await db.from('rr_alerts').insert({ user_id: p.user_id, property_id: p.id, kind: 'payment_failed', message: `${p.domain}: renter payment failed` });
      }
      break;
    }
  }
  const { error: recErr } = await db.from('rr_billing_events').insert({
    stripe_event_id: event.id, type: event.type, user_id: uid ?? null, property_id: pid ?? null,
  });
  if (recErr && (recErr as { code?: string }).code !== '23505') console.warn('event record failed', recErr.message);
  return json({ received: true });
}));
