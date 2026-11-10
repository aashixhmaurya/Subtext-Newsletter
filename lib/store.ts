import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const WORKSPACE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validWorkspace = (w: unknown): w is string => typeof w === "string" && WORKSPACE.test(w);

export function storageError(err: { message?: string; code?: string } | null) {
  if (err?.code === "42P01" || /does not exist/i.test(err?.message ?? "")) return "Supabase tables are missing. Run supabase/schema.sql in the SQL editor.";
  return err?.message ? `Supabase: ${err.message.slice(0, 160)}` : "Supabase request failed.";
}
