import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { generateManagementToken, getSistemaClient, maskManagementToken } from "@/lib/sistemas";

export async function POST(_request: Request, context: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = generateManagementToken();
  const { data, error } = await getSistemaClient().from("sistemas_gestionados").update({ management_token: token, updated_at: new Date().toISOString() }).eq("id", context.params.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  return NextResponse.json({ data: { id: data.id, management_token_masked: maskManagementToken(token) } });
}
