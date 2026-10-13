// Mock data for the Rank & Rent autonomous platform

export type PropertyStatus = 'ranking' | 'rented' | 'building' | 'optimizing' | 'leasing';

export interface Property {
  id: string;
  domain: string;
  niche: string;
  city: string;
  status: PropertyStatus;
  health: number; // 0-100
  rankPosition: number; // average SERP position
  rankChange: number; // change in position (negative = improved)
  keywords: number;
  monthlyLeads: number;
  mrr: number; // monthly recurring revenue
  client: string | null;
  trend: number[]; // sparkline data (position over time, lower is better)
  phone?: string | null;
  siteUrl?: string | null;
  deployedAt?: string | null;
  deployError?: string | null;
}

export const NICHE_COLORS: Record<string, string> = {
  Plumbing: '#38bdf8',
  HVAC: '#34d399',
  Roofing: '#fbbf24',
  Electrical: '#a78bfa',
  Landscaping: '#4ade80',
  'Pest Control': '#f472b6',
  Locksmith: '#facc15',
  Dental: '#22d3ee',
  Legal: '#fb7185',
  Cleaning: '#60a5fa',
};

export const properties: Property[] = [
  { id: 'p1', domain: 'austinemergencyplumber.com', niche: 'Plumbing', city: 'Austin, TX', status: 'rented', health: 94, rankPosition: 2, rankChange: -3, keywords: 28, monthlyLeads: 47, mrr: 1850, client: 'BlueFlow Plumbing Co.', trend: [9, 7, 6, 5, 4, 3, 2] },
  { id: 'p2', domain: 'denverhvacpros.com', niche: 'HVAC', city: 'Denver, CO', status: 'rented', health: 89, rankPosition: 3, rankChange: -1, keywords: 24, monthlyLeads: 38, mrr: 1600, client: 'PeakAir Mechanical', trend: [8, 7, 6, 5, 4, 4, 3] },
  { id: 'p3', domain: 'phoenixroofingexperts.com', niche: 'Roofing', city: 'Phoenix, AZ', status: 'ranking', health: 76, rankPosition: 7, rankChange: -4, keywords: 31, monthlyLeads: 19, mrr: 0, client: null, trend: [18, 15, 12, 11, 9, 8, 7] },
  { id: 'p4', domain: 'seattleelectricians.com', niche: 'Electrical', city: 'Seattle, WA', status: 'rented', health: 91, rankPosition: 1, rankChange: 0, keywords: 22, monthlyLeads: 52, mrr: 2100, client: 'Voltify Electric', trend: [5, 4, 3, 2, 1, 1, 1] },
  { id: 'p5', domain: 'miamilandscaping.com', niche: 'Landscaping', city: 'Miami, FL', status: 'optimizing', health: 68, rankPosition: 11, rankChange: 2, keywords: 26, monthlyLeads: 12, mrr: 0, client: null, trend: [9, 8, 9, 10, 11, 10, 11] },
  { id: 'p6', domain: 'dallaspestcontrol.com', niche: 'Pest Control', city: 'Dallas, TX', status: 'rented', health: 87, rankPosition: 4, rankChange: -2, keywords: 19, monthlyLeads: 33, mrr: 1450, client: 'GuardLine Pest', trend: [12, 10, 8, 7, 6, 5, 4] },
  { id: 'p7', domain: 'chicagolocksmith24.com', niche: 'Locksmith', city: 'Chicago, IL', status: 'ranking', health: 72, rankPosition: 6, rankChange: -5, keywords: 17, monthlyLeads: 24, mrr: 0, client: null, trend: [20, 16, 13, 10, 8, 7, 6] },
  { id: 'p8', domain: 'portlanddentalcare.com', niche: 'Dental', city: 'Portland, OR', status: 'rented', health: 95, rankPosition: 2, rankChange: -1, keywords: 33, monthlyLeads: 41, mrr: 2400, client: 'Brightsmile Dental', trend: [7, 5, 4, 3, 3, 2, 2] },
  { id: 'p9', domain: 'atlantainjurylawyer.com', niche: 'Legal', city: 'Atlanta, GA', status: 'leasing', health: 83, rankPosition: 5, rankChange: -3, keywords: 29, monthlyLeads: 28, mrr: 0, client: null, trend: [14, 11, 9, 8, 6, 5, 5] },
  { id: 'p10', domain: 'bostonhousecleaning.com', niche: 'Cleaning', city: 'Boston, MA', status: 'building', health: 41, rankPosition: 24, rankChange: 0, keywords: 8, monthlyLeads: 0, mrr: 0, client: null, trend: [30, 28, 27, 25, 24, 24, 24] },
  { id: 'p11', domain: 'sandiegohvacrepair.com', niche: 'HVAC', city: 'San Diego, CA', status: 'rented', health: 88, rankPosition: 3, rankChange: -2, keywords: 21, monthlyLeads: 36, mrr: 1700, client: 'CoolCoast HVAC', trend: [10, 8, 7, 6, 5, 4, 3] },
  { id: 'p12', domain: 'nashvilleroofers.com', niche: 'Roofing', city: 'Nashville, TN', status: 'optimizing', health: 65, rankPosition: 9, rankChange: 1, keywords: 23, monthlyLeads: 15, mrr: 0, client: null, trend: [11, 9, 8, 8, 9, 8, 9] },
  { id: 'p13', domain: 'tampaemergencyplumber.com', niche: 'Plumbing', city: 'Tampa, FL', status: 'rented', health: 90, rankPosition: 2, rankChange: -1, keywords: 27, monthlyLeads: 44, mrr: 1750, client: 'RapidFlow Plumbing', trend: [8, 6, 5, 4, 3, 2, 2] },
  { id: 'p14', domain: 'lasvegaselectric.com', niche: 'Electrical', city: 'Las Vegas, NV', status: 'ranking', health: 74, rankPosition: 8, rankChange: -3, keywords: 18, monthlyLeads: 21, mrr: 0, client: null, trend: [16, 13, 11, 10, 9, 8, 8] },
];

export interface Opportunity {
  id: string;
  niche: string;
  city: string;
  searchVolume: number;
  competition: number; // 0-100, lower is better
  cpc: number;
  estRevenue: number;
  score: number; // opportunity score 0-100
}

export const opportunities: Opportunity[] = [
  { id: 'o1', niche: 'Garage Door Repair', city: 'Charlotte, NC', searchVolume: 4400, competition: 22, cpc: 12.4, estRevenue: 2200, score: 92 },
  { id: 'o2', niche: 'Water Damage Restoration', city: 'Columbus, OH', searchVolume: 3600, competition: 31, cpc: 28.7, estRevenue: 3100, score: 89 },
  { id: 'o3', niche: 'Tree Removal', city: 'Sacramento, CA', searchVolume: 5200, competition: 38, cpc: 9.8, estRevenue: 1800, score: 84 },
  { id: 'o4', niche: 'Foundation Repair', city: 'Kansas City, MO', searchVolume: 2900, competition: 19, cpc: 18.2, estRevenue: 2600, score: 91 },
  { id: 'o5', niche: 'Septic Tank Service', city: 'Raleigh, NC', searchVolume: 2100, competition: 14, cpc: 15.6, estRevenue: 2000, score: 88 },
  { id: 'o6', niche: 'Mobile Mechanic', city: 'Jacksonville, FL', searchVolume: 3300, competition: 27, cpc: 7.4, estRevenue: 1500, score: 80 },
  { id: 'o7', niche: 'Junk Removal', city: 'Indianapolis, IN', searchVolume: 4800, competition: 34, cpc: 11.1, estRevenue: 1900, score: 82 },
  { id: 'o8', niche: 'Chimney Sweep', city: 'Cincinnati, OH', searchVolume: 1700, competition: 11, cpc: 13.9, estRevenue: 1700, score: 86 },
  { id: 'o9', niche: 'Pool Cleaning', city: 'Mesa, AZ', searchVolume: 3900, competition: 29, cpc: 8.6, estRevenue: 1600, score: 81 },
  { id: 'o10', niche: 'Towing Service', city: 'Memphis, TN', searchVolume: 6100, competition: 41, cpc: 6.2, estRevenue: 1400, score: 78 },
];

export interface Lead {
  id: string;
  property: string;
  niche: string;
  name: string;
  service: string;
  value: number; // estimated job value
  quality: 'high' | 'medium' | 'low';
  status: 'new' | 'verified' | 'forwarded' | 'flagged';
  channel: 'form' | 'chat' | 'call';
  time: string;
}

export const leads: Lead[] = [
  { id: 'l1', property: 'austinemergencyplumber.com', niche: 'Plumbing', name: 'Marcus T.', service: 'Burst pipe emergency', value: 850, quality: 'high', status: 'forwarded', channel: 'call', time: '2m ago' },
  { id: 'l2', property: 'portlanddentalcare.com', niche: 'Dental', name: 'Jenna R.', service: 'New patient cleaning', value: 320, quality: 'high', status: 'verified', channel: 'form', time: '14m ago' },
  { id: 'l3', property: 'seattleelectricians.com', niche: 'Electrical', name: 'Dev P.', service: 'Panel upgrade quote', value: 2400, quality: 'high', status: 'new', channel: 'chat', time: '21m ago' },
  { id: 'l4', property: 'denverhvacpros.com', niche: 'HVAC', name: 'Sara L.', service: 'AC not cooling', value: 600, quality: 'medium', status: 'verified', channel: 'form', time: '38m ago' },
  { id: 'l5', property: 'dallaspestcontrol.com', niche: 'Pest Control', name: 'Unknown', service: 'spam inquiry', value: 0, quality: 'low', status: 'flagged', channel: 'form', time: '52m ago' },
  { id: 'l6', property: 'tampaemergencyplumber.com', niche: 'Plumbing', name: 'Olivia K.', service: 'Water heater install', value: 1200, quality: 'high', status: 'forwarded', channel: 'call', time: '1h ago' },
  { id: 'l7', property: 'sandiegohvacrepair.com', niche: 'HVAC', name: 'Andre M.', service: 'Furnace tune-up', value: 180, quality: 'medium', status: 'new', channel: 'chat', time: '2h ago' },
  { id: 'l8', property: 'chicagolocksmith24.com', niche: 'Locksmith', name: 'Priya S.', service: 'Locked out of home', value: 140, quality: 'medium', status: 'verified', channel: 'call', time: '3h ago' },
];

export interface AgentEvent {
  id: string;
  agent: 'Discovery' | 'Architect' | 'SEO Optimizer' | 'Outreach' | 'Monetization';
  action: string;
  property: string;
  result: 'success' | 'pending' | 'info';
  time: string;
}

export const agentEvents: AgentEvent[] = [
  { id: 'a1', agent: 'SEO Optimizer', action: 'Refreshed content cluster "emergency repair" after rank drop detected', property: 'phoenixroofingexperts.com', result: 'success', time: '08:42' },
  { id: 'a2', agent: 'Outreach', action: 'Sent lead-sample preview SMS to prospective renter', property: 'atlantainjurylawyer.com', result: 'success', time: '08:31' },
  { id: 'a3', agent: 'Discovery', action: 'Validated new niche opportunity — Garage Door Repair, Charlotte', property: 'unassigned', result: 'info', time: '08:15' },
  { id: 'a4', agent: 'Architect', action: 'Deployed 14 localized city pages via Vercel', property: 'bostoncleaning.com', result: 'pending', time: '08:02' },
  { id: 'a5', agent: 'Monetization', action: 'Auto-collected recurring rent via Stripe ($2,400)', property: 'portlanddentalcare.com', result: 'success', time: '07:55' },
  { id: 'a6', agent: 'SEO Optimizer', action: 'Auto-updated 9 meta titles based on SERP movement', property: 'chicagolocksmith24.com', result: 'success', time: '07:40' },
  { id: 'a7', agent: 'Outreach', action: 'Triggered email — lead threshold (25) reached', property: 'lasvegaselectric.com', result: 'success', time: '07:28' },
  { id: 'a8', agent: 'Architect', action: 'Generated schema markup + internal link graph', property: 'nashvilleroofers.com', result: 'success', time: '07:11' },
];

export const seoKeywords = [
  { term: 'emergency plumber austin', pos: 2, vol: 2400, change: -3 },
  { term: 'plumber near me austin', pos: 1, vol: 5400, change: 0 },
  { term: '24 hour plumber austin tx', pos: 3, vol: 1300, change: -1 },
  { term: 'burst pipe repair austin', pos: 2, vol: 880, change: -4 },
  { term: 'water heater repair austin', pos: 5, vol: 1600, change: 2 },
  { term: 'drain cleaning austin tx', pos: 4, vol: 1100, change: -2 },
  { term: 'leak detection austin', pos: 6, vol: 720, change: -1 },
  { term: 'sewer line repair austin', pos: 8, vol: 540, change: -5 },
];

export const rankHistory = [
  { week: 'W1', position: 14 },
  { week: 'W2', position: 11 },
  { week: 'W3', position: 9 },
  { week: 'W4', position: 7 },
  { week: 'W5', position: 5 },
  { week: 'W6', position: 4 },
  { week: 'W7', position: 3 },
  { week: 'W8', position: 2 },
];

export const revenueHistory = [
  { month: 'Jan', mrr: 4200 },
  { month: 'Feb', mrr: 5800 },
  { month: 'Mar', mrr: 7100 },
  { month: 'Apr', mrr: 8900 },
  { month: 'May', mrr: 10400 },
  { month: 'Jun', mrr: 12650 },
];
