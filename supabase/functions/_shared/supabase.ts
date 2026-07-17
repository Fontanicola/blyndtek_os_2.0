import { createClient } from "npm:@supabase/supabase-js@2";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function todayLocalString(reference = new Date()) {
  return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}-${pad(reference.getDate())}`;
}

export function getSupabaseConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new Error("Missing environment variable: SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, serviceRoleKey };
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function todayISO(reference = new Date()) {
  return todayLocalString(reference);
}

export function addMonthsISO(dateString: string, months = 1) {
  const date = parseDateOnly(dateString);
  date.setMonth(date.getMonth() + months);
  return todayLocalString(date);
}

export function toIsoAtHour(dateString: string, hour: number, minute = 0) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0);
  return date.toISOString();
}
