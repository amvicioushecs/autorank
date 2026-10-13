// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildSite, slugify, defaultServices } from '../functions/_shared/site.ts';
import { freshDb, as, A } from './db';

const input = { domain: 'charlottegaragedoorrepair.com', niche: 'garage door repair', city: 'Charlotte, NC', phone: '(704) 555-0100', leadEndpoint: 'https://x.supabase.co/functions/v1/lead-capture', siteKey: 'k123', year: 2026 };

describe('site generator', () => {
  const files = buildSite(input);
  const byName = Object.fromEntries(files.map((f) => [f.file, f.data]));

  it('emits home, one page per service, thanks, sitemap and robots', () => {
    expect(Object.keys(byName)).toEqual(expect.arrayContaining(['index.html', 'garage-door-repair-repair/index.html', 'thanks/index.html', 'sitemap.xml', 'robots.txt']));
    expect(files).toHaveLength(defaultServices('x').length + 4);
  });

  it('includes localized title, LocalBusiness JSON-LD, tel link and a lead form wired to the endpoint', () => {
    const home = byName['index.html'];
    expect(home).toContain('<title>Garage Door Repair in Charlotte, NC');
    const ld = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    expect(ld).toMatchObject({ '@type': 'LocalBusiness', telephone: '(704) 555-0100', areaServed: { name: 'Charlotte' } });
    expect(home).toContain('href="tel:7045550100"');
    expect(home).toContain('action="https://x.supabase.co/functions/v1/lead-capture"');
    expect(home).toContain('name="site_key" value="k123"');
    expect(home).toContain('name="company"'); // honeypot
  });

  it('escapes user-provided text', () => {
    const evil = buildSite({ ...input, niche: '<script>alert(1)</script>', services: ['"><img src=x>'] });
    const html = evil.map((f) => f.data).join('');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('"><img src=x>');
  });

  it('lists every page in the sitemap', () => {
    expect(byName['sitemap.xml']).toContain('<loc>https://charlottegaragedoorrepair.com/</loc>');
    expect(byName['robots.txt']).toContain('Sitemap: https://charlottegaragedoorrepair.com/sitemap.xml');
    expect(slugify('  Emergency  Plumbing! ')).toBe('emergency-plumbing');
  });
});

describe('sites schema', () => {
  it('gives each property a unique site_key', async () => {
    const db = await freshDb();
    await as(db, A, () => db.exec(`insert into rr_properties (domain, niche, city) values ('a.com','n','c'), ('b.com','n','c')`));
    const r = await db.query<{ site_key: string }>('select site_key from rr_properties');
    expect(r.rows[0].site_key).toMatch(/^[0-9a-f]{32}$/);
    expect(r.rows[0].site_key).not.toBe(r.rows[1].site_key);
  });
});
