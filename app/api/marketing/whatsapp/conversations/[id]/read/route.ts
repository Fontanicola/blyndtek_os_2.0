import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["admin", "marketing"].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { error } = await createUntypedAdminClient().from("whatsapp_conversations").update({ unread_count: 0, updated_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id: params.id, unread: 0 } });
}
