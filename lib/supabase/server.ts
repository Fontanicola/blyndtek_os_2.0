import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

function getSupabaseServerEnv() {
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
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseServerEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value
        }));
      }
    }
  });
}
