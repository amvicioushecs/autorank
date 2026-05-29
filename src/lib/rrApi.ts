import { supabase } from '@/lib/supabase';
import { Property, Opportunity, Lead } from '@/data/platformData';

// ---------- Mappers ----------
const mapProperty = (r: any): Property => ({
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

const mapOpportunity = (r: any): Opportunity => ({
  id: r.id,
  niche: r.niche,
  city: r.city,
  searchVolume: r.search_volume,
  competition: r.competition,
  cpc: Number(r.cpc),
  estRevenue: r.est_revenue,
  score: r.score,
});

const mapLead = (r: any): Lead => ({
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

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------- Properties ----------
export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from('rr_properties').select('*').order('mrr', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProperty);
}

export async function createProperty(p: {
  domain: string; niche: string; city: string; status?: string;
  health?: number; rankPosition?: number; keywords?: number;
}): Promise<Property> {
  const row = {
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

export async function updatePropertyClient(id: string, client: string | null, mrr: number) {
  const { error } = await supabase
    .from('rr_properties')
    .update({ client, mrr, status: client ? 'rented' : 'ranking' })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Opportunities ----------
export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('rr_opportunities')
    .select('*')
    .eq('deployed', false)
    .order('score', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOpportunity);
}

export async function deployOpportunity(opp: Opportunity): Promise<Property> {
  // mark opportunity deployed
  await supabase.from('rr_opportunities').update({ deployed: true }).eq('id', opp.id);
  // create a property from it
  const slug = `${opp.city.split(',')[0].toLowerCase().replace(/\s+/g, '')}${opp.niche.toLowerCase().replace(/[^a-z]/g, '')}`;
  return createProperty({
    domain: `${slug}.com`.slice(0, 60),
    niche: opp.niche,
    city: opp.city,
    status: 'building',
    health: 40,
  });
}

// ---------- Leads ----------
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from('rr_leads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLead);
}

export async function updateLeadStatus(id: string, status: string) {
  const { error } = await supabase.from('rr_leads').update({ status }).eq('id', id);
  if (error) throw error;
}
