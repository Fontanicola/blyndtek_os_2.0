import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const contents = await readFile(resolve(".env.local"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const baseline = JSON.parse(await readFile(resolve("docs/seo/ai-visibility-baseline-2026-08-27.json"), "utf8"));

if (process.argv.includes("--migration")) {
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const values = baseline.runs.map((run) => `  (${quote(run.prompt)}, ${quote(run.engine)}, ${quote(run.engine_mode)}, ${quote(run.response_summary)}, ${quote(JSON.stringify(run.competitors))}::jsonb, ${quote(run.evidence_url)})`).join(",\n");
  const sql = `-- Línea de base de visibilidad en buscadores con IA — ${baseline.measured_at}\n\nbegin;\n\nwith evidence(prompt, engine, engine_mode, response_text, competitors, evidence_url) as (\n  values\n${values}\n)\ninsert into public.seo_ai_runs (prompt_id, engine, engine_mode, run_at, session_state, response_text, mentions_blyndtek, prominence, cited_url, competitors, description_accuracy, evidence_url, notes)\nselect p.id, e.engine, e.engine_mode, ${quote(baseline.measured_at)}::timestamptz, 'fresh_or_incognito', e.response_text, false, 'absent', null, e.competitors, 'not_applicable', e.evidence_url, ${quote(baseline.methodology)}\nfrom evidence e\njoin public.seo_ai_prompts p on p.prompt = e.prompt and p.country = ${quote(baseline.country)} and p.language = ${quote(baseline.language)}\non conflict (prompt_id, engine, run_at) do update set\n  response_text = excluded.response_text, competitors = excluded.competitors, evidence_url = excluded.evidence_url, notes = excluded.notes;\n\nupdate public.seo_data_sources\nset status = 'connected', last_sync_at = ${quote(baseline.measured_at)}::timestamptz, last_error = null, metadata = ${quote(JSON.stringify({ engines: 4, prompts: 7, runs: baseline.runs.length, mentions: 0, country: baseline.country, language: baseline.language }))}::jsonb\nwhere source_key = 'ai_visibility';\n\nupdate public.seo_data_sources\nset status = 'partial', last_sync_at = now(), last_error = null, metadata = coalesce(metadata, '{}'::jsonb) || '{"verification_method":"html_meta","verification_tag_deployed":true,"property":"https://www.blyndtek.com/"}'::jsonb\nwhere source_key = 'google_search_console';\n\ncommit;\n`;
  const output = resolve("supabase/migrations/049_ai_visibility_baseline.sql");
  await writeFile(output, sql, "utf8");
  console.log(output);
  process.exit(0);
}

await loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: prompts, error: promptError } = await supabase.from("seo_ai_prompts").select("id,prompt");
if (promptError) throw promptError;
const promptIds = new Map(prompts.map((item) => [item.prompt, item.id]));

const rows = baseline.runs.map((run) => {
  const promptId = promptIds.get(run.prompt);
  if (!promptId) throw new Error(`No existe el prompt: ${run.prompt}`);
  return {
    prompt_id: promptId,
    engine: run.engine,
    engine_mode: run.engine_mode,
    run_at: baseline.measured_at,
    session_state: "fresh_or_incognito",
    response_text: run.response_summary,
    mentions_blyndtek: false,
    prominence: "absent",
    cited_url: null,
    competitors: run.competitors,
    description_accuracy: "not_applicable",
    evidence_url: run.evidence_url,
    notes: baseline.methodology,
  };
});

const { error: runError } = await supabase.from("seo_ai_runs").upsert(rows, { onConflict: "prompt_id,engine,run_at" });
if (runError) throw runError;
const { error: sourceError } = await supabase.from("seo_data_sources").update({
  status: "connected",
  last_sync_at: baseline.measured_at,
  last_error: null,
  metadata: { engines: 4, prompts: 7, runs: rows.length, mentions: 0, country: baseline.country, language: baseline.language },
}).eq("source_key", "ai_visibility");
if (sourceError) throw sourceError;

console.log(JSON.stringify({ imported: rows.length, engines: 4, prompts: 7, mentions: 0 }));
