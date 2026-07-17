import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAgentesCostoTotal, type AgentesHubPeriod } from "@/lib/agentes/hub";
import type { AgentesDatabase } from "@/types/agentes";

function parsePeriod(value: string | null): AgentesHubPeriod {
  if (value === "quarter" || value === "year") {
    return value;
  }

  return "month";
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const period = parsePeriod(url.searchParams.get("period"));
    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const data = await fetchAgentesCostoTotal(supabase, period);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
