import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Supabase client acting as the caller (RLS applies) + the verified user. */
export async function requireUser(req: Request): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new HttpError(401, 'Sign in required');
  return { supabase, user: data.user };
}

/** Service-role client for trusted server work (webhooks, cron). Bypasses RLS: scope every query. */
export function serviceClient(): SupabaseClient {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new HttpError(500, 'SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } });
}

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  };
}
