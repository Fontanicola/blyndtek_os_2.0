import { NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { getInstagramPublishingCapability } from "@/lib/meta/instagram-publishing";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getBrandManagerUser();
  if (!user)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = createUntypedAdminClient();
  const [capability, mediaResult, connectionResult] = await Promise.all([
    getInstagramPublishingCapability().catch(() => ({
      connected: false,
      canPublish: false,
      missingPermissions: ["instagram_content_publish"],
      accountId: null,
    })),
    db
      .from("instagram_media")
      .select(
        "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,posted_at,like_count,comments_count,synced_at",
      )
      .order("posted_at", { ascending: false })
      .limit(60),
    db
      .from("meta_connections")
      .select("last_sync_at,last_error")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (mediaResult.error)
    return NextResponse.json(
      { error: mediaResult.error.message },
      { status: 500 },
    );
  return NextResponse.json({
    data: {
      capability,
      connection: connectionResult.data || null,
      media: mediaResult.data || [],
    },
  });
}
