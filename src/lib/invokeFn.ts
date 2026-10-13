import { supabase } from '@/lib/supabase';

/** Invoke a Supabase edge function and turn any error payload into a thrown Error with its message. */
export async function invokeFn<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx?.json) msg = (await ctx.json()).error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
