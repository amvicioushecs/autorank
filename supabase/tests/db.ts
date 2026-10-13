import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');

/** Fresh in-memory Postgres with the Supabase stub + every migration applied in order. */
export async function freshDb(extraFixtures: string[] = []) {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests/fixtures/supabase_stub.sql'), 'utf8'));
  for (const f of extraFixtures) {
    const p = join(root, 'tests/fixtures', f);
    if (existsSync(p)) await db.exec(readFileSync(p, 'utf8'));
  }
  const dir = join(root, 'migrations');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
  return db;
}

/** Run statements as a given Supabase role / user (null = anon). Resets afterwards. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${userId ? 'authenticated' : 'anon'};`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

export const A = '00000000-0000-0000-0000-00000000000a';
export const B = '00000000-0000-0000-0000-00000000000b';
