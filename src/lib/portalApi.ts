import { supabase } from '@/lib/supabase';

export interface PortalLead {
  id: string; name: string; service: string; value: number; quality: string; status: string; channel: string; created_at: string;
}
export interface PortalView {
  property: { domain: string; niche: string; city: string; client: string | null; rankPosition: number | null; monthlyLeads: number | null; trend: number[] | null };
  leads: PortalLead[];
  expiresAt: string;
}

export const portalUrl = (token: string, origin = window.location.origin) => `${origin}/portal/${token}`;

/** Owner-only: mint a new portal token (plaintext is returned once). */
export async function createPortalToken(propertyId: string, days = 90): Promise<string> {
  const { data, error } = await supabase.rpc('rr_create_portal_token', { p_property_id: propertyId, p_days: days });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('No token returned');
  return data;
}

/** Owner-only: revoke every active link for a property. */
export async function revokePortalTokens(propertyId: string): Promise<void> {
  const { error } = await supabase
    .from('rr_portal_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('property_id', propertyId)
    .is('revoked_at', null);
  if (error) throw error;
}

/** Public: resolve a token to the client's read-only view (null if invalid/expired/revoked). */
export async function fetchPortalView(token: string): Promise<PortalView | null> {
  const { data, error } = await supabase.rpc('rr_portal_view', { p_token: token });
  if (error) throw error;
  return (data as PortalView | null) ?? null;
}

export function inviteMailto(email: string, domain: string, url: string): string {
  const subject = `Your lead dashboard for ${domain}`;
  const body = `Hi,\n\nHere is your private dashboard for ${domain}, showing your leads and ranking:\n${url}\n\nKeep this link private; anyone with it can view the dashboard.`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
