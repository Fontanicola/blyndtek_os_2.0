import { NextRequest, NextResponse } from "next/server";
import { publishInstagramPiece } from "@/lib/meta/instagram-publishing";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const db = createUntypedAdminClient();
  const { data, error } = await db.rpc("claim_due_instagram_pieces", {
    max_items: 5,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [] as Array<{
    id: string;
    status: "published" | "failed";
    externalId?: string | null;
    error?: string;
  }>;
  for (const piece of data ?? []) {
    try {
      const published = await publishInstagramPiece(String(piece.id));
      results.push({
        id: String(piece.id),
        status: "published",
        externalId: published.id,
      });
    } catch (cause) {
      results.push({
        id: String(piece.id),
        status: "failed",
        error: cause instanceof Error ? cause.message : "Error desconocido",
      });
    }
  }
  return NextResponse.json({ data: { claimed: data?.length || 0, results } });
}
