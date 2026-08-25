#!/usr/bin/env node

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const [, , command, ...rawArgs] = process.argv;
const args = new Map();
for (let index = 0; index < rawArgs.length; index += 1) {
  const token = rawArgs[index];
  if (!token.startsWith("--")) continue;
  const [key, inline] = token.slice(2).split("=", 2);
  const value = inline ?? (rawArgs[index + 1]?.startsWith("--") ? "true" : rawArgs[++index]);
  args.set(key, value ?? "true");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function text(name, fallback = null, max = 4000) {
  const value = args.get(name);
  if (!value) return fallback;
  return value.replace(/((?:authorization|password|secret|token|api[_-]?key|cookie)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]").slice(0, max);
}

function count(name) {
  const value = Number(args.get(name) ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

async function systemId() {
  const project = text("project", null, 200);
  const name = text("system", null, 200);
  if (!project && !name) return null;
  let query = client.from("sistemas_gestionados").select("id").limit(1);
  query = project ? query.eq("vercel_project_id", project) : query.eq("nombre", name);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No se encontró el sistema indicado.");
  return data.id;
}

if (command === "guardia") {
  const now = new Date();
  const from = text("from", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), 50);
  const to = text("to", now.toISOString(), 50);
  const status = text("status", "saludable", 30);
  const { data, error } = await client.from("sistemas_guardias").insert({
    automation_id: text("automation", "guardia-t-cnica-diaria-blyndtek", 200),
    estado: status,
    ventana_desde: from,
    ventana_hasta: to,
    iniciada_at: text("started", to, 50),
    finalizada_at: status === "ejecutando" ? null : text("finished", to, 50),
    resumen: text("summary", "Guardia técnica completada."),
    sistemas_revisados: count("systems"),
    incidentes_detectados: count("incidents"),
    acciones_ejecutadas: count("actions"),
    metadata: { source: "codex_guard", version: 1 }
  }).select("id,estado").single();
  if (error) throw error;
  process.stdout.write(JSON.stringify(data));
} else if (command === "accion") {
  const now = new Date().toISOString();
  const { data, error } = await client.from("sistemas_acciones_tecnicas").insert({
    guardia_id: text("guard", null, 100),
    sistema_id: await systemId(),
    incidente_id: text("incident", null, 100),
    actor: text("actor", "codex", 30),
    tipo: text("type", "diagnostico", 120),
    estado: text("status", "verificada", 30),
    titulo: text("title", "Acción técnica registrada.", 300),
    detalle: text("detail"),
    evidencia: { source: "codex_guard" },
    branch: text("branch", null, 500),
    commit_sha: text("commit", null, 100),
    deployment_id: text("deployment", null, 200),
    external_url: text("url", null, 1000),
    iniciada_at: text("started", now, 50),
    finalizada_at: text("finished", now, 50)
  }).select("id,estado").single();
  if (error) throw error;
  process.stdout.write(JSON.stringify(data));
} else {
  process.stderr.write("Uso: npm run tech:record -- guardia|accion [--campo valor]\n");
  process.exitCode = 1;
}
