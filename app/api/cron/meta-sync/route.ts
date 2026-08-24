import { NextRequest, NextResponse } from "next/server";
import { getMetaConfig } from "@/lib/meta/config";
import { syncInstagram } from "@/lib/meta/instagram";
import { syncMetaAds } from "@/lib/meta/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const config = getMetaConfig();
  if (!config.configured) {
    return NextResponse.json({
      data: {
        status: "skipped",
        reason: "Meta todavía no está configurado."
      }
    });
  }

  try {
    const result = await syncMetaAds(null, "cron");
    const instagram = config.instagramAccountId
      ? await syncInstagram().then((data) => ({ status: "success" as const, data })).catch((error) => ({ status: "pending" as const, error: error instanceof Error ? error.message : "No se pudo sincronizar Instagram." }))
      : { status: "skipped" as const, error: "Falta META_INSTAGRAM_ACCOUNT_ID." };
    return NextResponse.json({ data: { ...result, instagram } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo sincronizar Meta." }, { status: 500 });
  }
}
