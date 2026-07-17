import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAgentesFeed } from "@/lib/agentes/hub";
import type { AgentesDatabase } from "@/types/agentes";

function parseLimit(value: string | null) {
  if (!value) {
    return 30;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.max(1, Math.min(500, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const data = await fetchAgentesFeed(supabase, limit);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
