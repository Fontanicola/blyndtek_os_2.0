import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url: normalizeSupabaseUrl(url), anonKey };
}

export function createClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();

  return createBrowserClient<Database>(url, anonKey);
}
