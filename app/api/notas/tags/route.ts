import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TagsRow = {
  tags: string[] | null;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notas")
      .select("tags")
      .eq("en_papelera", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tags = new Map<string, number>();

    (data ?? []).forEach((row) => {
      const current = (row as TagsRow).tags ?? [];
      current.forEach((tag) => {
        const normalized = tag.trim();
        if (!normalized) {
          return;
        }

        tags.set(normalized, (tags.get(normalized) ?? 0) + 1);
      });
    });

    const ordered = [...tags.entries()]
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "es"))
      .map(([tag]) => tag);

    return NextResponse.json({ data: ordered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
