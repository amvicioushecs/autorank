import { invokeFn } from '@/lib/invokeFn';

export const createCheckoutLink = (o: { propertyId: string; clientName: string; clientEmail: string; monthlyRent: number }) =>
  invokeFn<{ url: string; clientId: string }>('billing-checkout', o);

/** Public: a client with a portal token opens Stripe's billing portal for their own account. */
export const openBillingPortal = (token: string) => invokeFn<{ url: string }>('portal-billing', { token });
