// Pure static-site generator for a rank-and-rent property (no Deno/Node APIs; unit-tested).

export interface SiteInput {
  domain: string;
  niche: string;
  city: string; // "Charlotte, NC"
  phone?: string | null;
  services?: string[];
  leadEndpoint: string; // POST URL of the lead-capture function
  siteKey: string; // public per-site key the lead form sends
  year?: number;
}

export interface SiteFile { file: string; data: string }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function defaultServices(niche: string): string[] {
  const n = titleCase(niche.trim());
  return [`Emergency ${n}`, `${n} Repair`, `${n} Installation`, `${n} Inspection`, `Commercial ${n}`];
}

function splitCity(city: string) {
  const [name, region = ''] = city.split(',').map((x) => x.trim());
  return { name, region };
}

function layout(o: { title: string; description: string; canonical: string; body: string; jsonLd: object; }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(o.canonical)}">
<script type="application/ld+json">${JSON.stringify(o.jsonLd).replace(/</g, '\\u003c')}</script>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#0f172a;line-height:1.6}
header,main,footer{max-width:960px;margin:0 auto;padding:16px}
header{display:flex;justify-content:space-between;align-items:center}
.cta{background:#0ea5e9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600}
.hero{padding:48px 16px;background:#f1f5f9}
form{display:grid;gap:8px;max-width:420px}input,textarea,button{font:inherit;padding:10px;border:1px solid #cbd5e1;border-radius:6px}
button{background:#0f172a;color:#fff;border:0;cursor:pointer}ul.services{columns:2}
.hp{position:absolute;left:-9999px}
</style>
</head>
<body>
${o.body}
</body>
</html>
`;
}

export function buildSite(input: SiteInput): SiteFile[] {
  const { name: cityName, region } = splitCity(input.city);
  const niche = titleCase(input.niche.trim());
  const services = (input.services?.length ? input.services : defaultServices(input.niche)).slice(0, 12);
  const base = `https://${input.domain}`;
  const year = input.year ?? new Date().getUTCFullYear();
  const phoneLink = input.phone ? `<a class="cta" href="tel:${esc(input.phone.replace(/[^0-9+]/g, ''))}">Call ${esc(input.phone)}</a>` : '<a class="cta" href="#quote">Get a free quote</a>';

  const business = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${cityName} ${niche}`,
    url: base,
    areaServed: { '@type': 'City', name: cityName, ...(region ? { containedInPlace: { '@type': 'State', name: region } } : {}) },
    ...(input.phone ? { telephone: input.phone } : {}),
    makesOffer: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })),
  };

  const form = `<section id="quote"><h2>Request a free quote</h2>
<form method="post" action="${esc(input.leadEndpoint)}">
<input type="hidden" name="site_key" value="${esc(input.siteKey)}">
<input class="hp" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
<input name="name" placeholder="Your name" required maxlength="120">
<input name="phone" type="tel" placeholder="Phone" required maxlength="40">
<input name="email" type="email" placeholder="Email (optional)" maxlength="200">
<select name="service">${services.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
<textarea name="message" placeholder="What do you need?" maxlength="2000"></textarea>
<button type="submit">Send request</button>
</form></section>`;

  const header = `<header><strong>${esc(cityName)} ${esc(niche)}</strong>${phoneLink}</header>`;
  const footer = `<footer><p>&copy; ${year} ${esc(cityName)} ${esc(niche)}. Serving ${esc(input.city)} and surrounding areas.</p></footer>`;

  const home = layout({
    title: `${niche} in ${cityName}${region ? `, ${region}` : ''} | Fast, Local & Licensed`,
    description: `Trusted ${niche.toLowerCase()} in ${input.city}. Same-day service, upfront pricing and free quotes. Call or request a quote online.`,
    canonical: `${base}/`,
    jsonLd: business,
    body: `${header}
<div class="hero"><main><h1>${esc(niche)} in ${esc(input.city)}</h1>
<p>Local, licensed ${esc(niche.toLowerCase())} pros serving ${esc(cityName)}. Fast response, honest pricing.</p>${phoneLink}</main></div>
<main><h2>Our ${esc(niche)} services in ${esc(cityName)}</h2>
<ul class="services">${services.map((s) => `<li><a href="/${slugify(s)}/">${esc(s)}</a></li>`).join('')}</ul>
${form}</main>
${footer}`,
  });

  const servicePages: SiteFile[] = services.map((s) => ({
    file: `${slugify(s)}/index.html`,
    data: layout({
      title: `${s} in ${cityName} | ${cityName} ${niche}`,
      description: `${s} in ${input.city}. Local experts, fast scheduling and free estimates.`,
      canonical: `${base}/${slugify(s)}/`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Service', name: s, areaServed: cityName, provider: { '@type': 'LocalBusiness', name: business.name, url: base } },
      body: `${header}<main><p><a href="/">Home</a> › ${esc(s)}</p>
<h1>${esc(s)} in ${esc(input.city)}</h1>
<p>Need ${esc(s.toLowerCase())} in ${esc(cityName)}? Our local team handles it quickly and professionally, with upfront quotes.</p>
${form}</main>${footer}`,
    }),
  }));

  const thanks: SiteFile = {
    file: 'thanks/index.html',
    data: layout({ title: 'Thanks! We will call you shortly', description: 'Request received.', canonical: `${base}/thanks/`, jsonLd: business, body: `${header}<main><h1>Thanks — request received</h1><p>A local pro will contact you shortly.</p></main>${footer}` }),
  };

  const urls = ['/', ...services.map((s) => `/${slugify(s)}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>
`;
  return [
    { file: 'index.html', data: home },
    ...servicePages,
    thanks,
    { file: 'sitemap.xml', data: sitemap },
    { file: 'robots.txt', data: `User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: ${base}/sitemap.xml\n` },
  ];
}
