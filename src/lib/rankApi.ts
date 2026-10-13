import { supabase } from '@/lib/supabase';
import { ownerId } from '@/lib/rrApi';
import { invokeFn } from '@/lib/invokeFn';

export interface Alert { id: string; propertyId: string | null; kind: string; message: string; readAt: string | null; createdAt: string }
export interface RankRunResult { checked: number; results: { id: string; position?: number | null; alert?: string | null; error?: string | null }[] }

export const runRankCheck = (propertyId?: string) => invokeFn<RankRunResult>('rank-check', propertyId ? { propertyId } : {});

export async function fetchAlerts(limit = 20): Promise<Alert[]> {
  const uid = await ownerId();
  const { data, error } = await supabase.from('rr_alerts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, propertyId: r.property_id, kind: r.kind, message: r.message, readAt: r.read_at, createdAt: r.created_at }));
}

export async function markAlertsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const uid = await ownerId();
  const { error } = await supabase.from('rr_alerts').update({ read_at: new Date().toISOString() }).in('id', ids).eq('user_id', uid);
  if (error) throw error;
}
