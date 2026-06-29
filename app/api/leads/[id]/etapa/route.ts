import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EtapaLead, Lead } from "@/types/leads";

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateEtapaBody = {
  etapa?: EtapaLead;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateEtapaBody;

    if (!body.etapa) {
      return NextResponse.json({ error: "Etapa is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ etapa: body.etapa })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
