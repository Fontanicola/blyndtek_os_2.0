import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type ReorderEntry = {
  kind: "folder" | "file";
  id: string;
};

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { entries?: ReorderEntry[] };
    const entries = body.entries ?? [];

    if (entries.length === 0) {
      return NextResponse.json({ error: "entries is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    for (const [index, entry] of entries.entries()) {
      const orden = index + 1;

      if (entry.kind === "folder") {
        const { error } = await supabase
          .from("carpetas")
          .update({ orden } as never)
          .eq("id", entry.id);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        continue;
      }

      const { error } = await supabase.from("archivos").update({ orden } as never).eq("id", entry.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
