import { SeoModule } from "@/components/seo/SeoModule";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const supabase = createUntypedAdminClient();
  const [{ data: sources }, { data: prompts }, { data: runs }, { data: snapshot }] = await Promise.all([
    supabase.from("seo_data_sources").select("source_key,label,status,last_sync_at,last_error").order("label"),
    supabase.from("seo_ai_prompts").select("id,prompt,cluster,country,language").eq("active", true).order("created_at"),
    supabase.from("seo_ai_runs").select("id,prompt_id,engine,engine_mode,run_at,mentions_blyndtek,prominence,evidence_url,competitors,response_text").order("run_at", { ascending: false }).limit(100),
    supabase
      .from("seo_daily_snapshots")
      .select("snapshot_date,clicks,impressions,ctr,average_position,conversions,metadata")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return <SeoModule liveData={{ sources: sources ?? [], prompts: prompts ?? [], aiRuns: runs ?? [], snapshot }} />;
}
