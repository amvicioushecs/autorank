// Supabase Edge Function: site-deploy
// Generates the static lead-gen site for one of the caller's properties and deploys it to Vercel
// (POST /v13/deployments with inline files, target production), then attaches the custom domain
// to the project (POST /v10/projects/{name}/domains). Stores the live URL on the property.
// Body: { propertyId: string }
// Secrets: VERCEL_TOKEN (required), VERCEL_TEAM_ID (optional). Domain DNS must point at Vercel.
import { handle, HttpError, json, requireUser } from '../_shared/http.ts';
import { buildSite, slugify } from '../_shared/site.ts';

const VERCEL = 'https://api.vercel.com';

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const { supabase, user } = await requireUser(req);
  const token = Deno.env.get('VERCEL_TOKEN');
  if (!token) throw new HttpError(500, 'VERCEL_TOKEN not configured on the server');
  const team = Deno.env.get('VERCEL_TEAM_ID');
  const qs = team ? `?teamId=${encodeURIComponent(team)}` : '';

  const { propertyId } = await req.json().catch(() => ({})) as { propertyId?: string };
  if (!propertyId) throw new HttpError(400, 'propertyId required');
  const { data: p, error } = await supabase.from('rr_properties')
    .select('id, domain, niche, city, phone, site_key, services')
    .eq('id', propertyId).eq('user_id', user.id).single();
  if (error || !p) throw new HttpError(404, 'Property not found');

  const files = buildSite({
    domain: p.domain,
    niche: p.niche,
    city: p.city,
    phone: p.phone,
    services: Array.isArray(p.services) ? p.services : undefined,
    siteKey: p.site_key,
    leadEndpoint: `${Deno.env.get('SUPABASE_URL')}/functions/v1/lead-capture`,
  });
  const project = slugify(p.domain).slice(0, 90);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const dep = await fetch(`${VERCEL}/v13/deployments${qs}${qs ? '&' : '?'}skipAutoDetectionConfirmation=1`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: project,
      target: 'production',
      files: files.map((f) => ({ file: f.file, data: f.data })),
      projectSettings: { framework: null, buildCommand: null, outputDirectory: null, installCommand: null },
      meta: { autorankPropertyId: p.id },
    }),
  });
  const depBody = await dep.json().catch(() => ({}));
  if (!dep.ok) {
    await supabase.from('rr_properties').update({ deploy_error: depBody?.error?.message ?? `Vercel ${dep.status}` }).eq('id', p.id).eq('user_id', user.id);
    throw new HttpError(502, `Vercel deployment failed: ${depBody?.error?.message ?? dep.status}`);
  }

  // Attach the custom domain (idempotent: 409 / domain_already_in_use_by_project is fine).
  let domainNote: string | null = null;
  const dom = await fetch(`${VERCEL}/v10/projects/${encodeURIComponent(project)}/domains${qs}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: p.domain }),
  });
  if (!dom.ok && dom.status !== 409) {
    const b = await dom.json().catch(() => ({}));
    domainNote = b?.error?.message ?? `domain attach failed (${dom.status})`;
  }

  const siteUrl = `https://${depBody.url}`;
  const { error: upErr } = await supabase.from('rr_properties').update({
    site_url: siteUrl,
    deployment_id: depBody.id,
    deployed_at: new Date().toISOString(),
    deploy_error: domainNote,
    status: 'ranking',
  }).eq('id', p.id).eq('user_id', user.id);
  if (upErr) throw new HttpError(500, upErr.message);

  return json({ deploymentId: depBody.id, url: siteUrl, readyState: depBody.readyState, files: files.length, domainNote });
}));
