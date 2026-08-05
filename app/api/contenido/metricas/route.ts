import { NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getBrandManagerUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const url = new URL(request.url);
  const piezaId = url.searchParams.get("pieza_id");
  const supabase = createAdminClient();
  let query = supabase.from("contenido_metricas").select("*").order("fecha", { ascending: false }).limit(90);
  if (piezaId) query = query.eq("pieza_id", piezaId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
