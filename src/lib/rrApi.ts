import { supabase } from '@/lib/supabase';
import { Property, Opportunity, Lead } from '@/data/platformData';

// ---------- Mappers ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const mapProperty = (r: Row): Property => ({
  id: r.id,
  domain: r.domain,
  niche: r.niche,
  city: r.city,
  status: r.status,
  health: r.health,
  rankPosition: r.rank_position,
  rankChange: r.rank_change,
  keywords: r.keywords,
  monthlyLeads: r.monthly_leads,
  mrr: r.mrr,
  client: r.client,
  trend: Array.isArray(r.trend) ? r.trend : [],
});

const mapOpportunity = (r: Row): Opportunity => ({
  id: r.id,
  niche: r.niche,
  city: r.city,
  searchVolume: r.search_volume,
  competition: r.competition,
  cpc: Number(r.cpc),
  estRevenue: r.est_revenue,
  score: r.score,
});

const mapLead = (r: Row): Lead => ({
  id: r.id,
  property: r.property,
  niche: r.niche,
  name: r.name,
  service: r.service,
  value: r.value,
  quality: r.quality,
  status: r.status,
  channel: r.channel,
  time: relTime(r.created_at),
});

export function relTime(ts: string, now = Date.now()): string {
  const diff = now - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------- Ownership ----------
export async function ownerId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Sign in required');
  return id;
}

// ---------- Properties ----------
export async function fetchProperties(): Promise<Property[]> {
  const uid = await ownerId();
  const { data, error } = await supabase.from('rr_properties').select('*').eq('user_id', uid).order('mrr', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProperty);
}

export async function createProperty(p: {
  domain: string; niche: string; city: string; status?: string;
  health?: number; rankPosition?: number; keywords?: number;
}): Promise<Property> {
  const row = {
    user_id: await ownerId(),
    domain: p.domain,
    niche: p.niche,
    city: p.city,
    status: p.status ?? 'building',
    health: p.health ?? 42,
    rank_position: p.rankPosition ?? 28,
    rank_change: 0,
    keywords: p.keywords ?? 0,
    monthly_leads: 0,
    mrr: 0,
    client: null,
    trend: [30, 28, 27, 26, 25, 24, 24],
  };
  const { data, error } = await supabase.from('rr_properties').insert(row).select().single();
  if (error) throw error;
  return mapProperty(data);
}

/** Status a property should have after (un)assigning a client. */
export const clientStatus = (client: string | null): 'rented' | 'ranking' => (client ? 'rented' : 'ranking');

export async function updatePropertyClient(id: string, client: string | null, mrr: number) {
  const uid = await ownerId();
  const { error } = await supabase
    .from('rr_properties')
    .update({ client, mrr, status: clientStatus(client) })
    .eq('id', id)
    .eq('user_id', uid);
  if (error) throw error;
}

// ---------- Opportunities ----------
export async function fetchOpportunities(): Promise<Opportunity[]> {
  const uid = await ownerId();
  const { data, error } = await supabase
    .from('rr_opportunities')
    .select('*')
    .eq('user_id', uid)
    .eq('deployed', false)
    .order('score', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOpportunity);
}

export async function createOpportunity(o: Omit<Opportunity, 'id'>): Promise<Opportunity> {
  const { data, error } = await supabase
    .from('rr_opportunities')
    .insert({
      user_id: await ownerId(),
      niche: o.niche,
      city: o.city,
      search_volume: o.searchVolume,
      competition: o.competition,
      cpc: o.cpc,
      est_revenue: o.estRevenue,
      score: o.score,
      deployed: false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapOpportunity(data);
}

// ---------- Starter portfolio (first sign-in) ----------
export async function seedStarter(): Promise<number> {
  const { data, error } = await supabase.rpc('rr_seed_starter');
  if (error) throw error;
  return Number(data) || 0;
}

/** Build a domain suggestion from an opportunity, e.g. "Charlotte, NC" + "Garage Door Repair" -> charlottegaragedoorrepair.com */
export function domainForOpportunity(opp: Pick<Opportunity, 'city' | 'niche'>): string {
  const city = opp.city.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const niche = opp.niche.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${`${city}${niche}`.slice(0, 56)}.com`;
}

/**
 * Deploy an opportunity: create the property FIRST, then mark the opportunity deployed.
 * If marking fails, the just-created property is deleted (rollback) so state stays consistent.
 */
export async function deployOpportunity(opp: Opportunity): Promise<Property> {
  const uid = await ownerId();
  const property = await createProperty({
    domain: domainForOpportunity(opp),
    niche: opp.niche,
    city: opp.city,
    status: 'building',
    health: 40,
  });
  const { error } = await supabase
    .from('rr_opportunities')
    .update({ deployed: true })
    .eq('id', opp.id)
    .eq('user_id', uid);
  if (error) {
    const { error: rbErr } = await supabase.from('rr_properties').delete().eq('id', property.id).eq('user_id', uid);
    if (rbErr) console.error('Rollback of property failed', rbErr);
    throw error;
  }
  return property;
}

// ---------- Leads ----------
export async function fetchLeads(): Promise<Lead[]> {
  const uid = await ownerId();
  const { data, error } = await supabase.from('rr_leads').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLead);
}

export async function updateLeadStatus(id: string, status: string) {
  const uid = await ownerId();
  const { error } = await supabase.from('rr_leads').update({ status }).eq('id', id).eq('user_id', uid);
  if (error) throw error;
}
