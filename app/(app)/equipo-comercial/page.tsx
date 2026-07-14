import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatUSD } from "@/lib/utils/formatters";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import type { Cliente } from "@/types/clientes";
import type { Comision } from "@/types/comisiones";
import type { Lead } from "@/types/leads";
import type { Usuario } from "@/types/auth";
import type { Cotizacion } from "@/types/cotizaciones";

export const dynamic = "force-dynamic";

type CommercialUserMetrics = {
  user: Pick<Usuario, "id" | "nombre" | "foto_url" | "rol">;
  leadsTotal: number;
  leadsPorEtapa: Array<{ etapa: string; cantidad: number }>;
  clientesConvertidos: number;
  ventasCerradasMes: number;
  ventasCerradasMontoMes: number;
  comisionesPendientesMes: number;
  comisionesPagadasMes: number;
  tasaConversion: number | null;
};

const ETAPAS = [
  "por_contactar",
  "contactado",
  "seguimiento",
  "calificado",
  "cotizacion",
  "ganado",
  "descartado"
] as const;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function isInRange(date: string | null | undefined, start: Date, end: Date) {
  if (!date) {
    return false;
  }

  const current = new Date(date);
  return current >= start && current < end;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "Sin datos";
  }

  return `${value.toFixed(1)}%`;
}

function buildMetrics({
  user,
  leads,
  clientes,
  cotizaciones,
  comisiones
}: {
  user: Pick<Usuario, "id" | "nombre" | "foto_url" | "rol">;
  leads: Lead[];
  clientes: Cliente[];
  cotizaciones: Cotizacion[];
  comisiones: Comision[];
}): CommercialUserMetrics {
  const userLeads = leads.filter((lead) => lead.vendedor_id === user.id);
  const userClientes = clientes.filter((cliente) => cliente.vendedor_id === user.id);
  const userCotizaciones = cotizaciones.filter(
    (cotizacion) => cotizacion.cliente_id && userClientes.some((cliente) => cliente.id === cotizacion.cliente_id)
  );

  const leadsPorEtapa = ETAPAS.map((etapa) => ({
    etapa,
    cantidad: userLeads.filter((lead) => lead.etapa === etapa).length
  }));

  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  const ventasCerradas = userCotizaciones.filter((cotizacion) => cotizacion.estado === "aceptada" && isInRange(cotizacion.updated_at, start, end));
  const comisionesMes = comisiones.filter((comision) => comision.vendedor_id === user.id && isInRange(comision.created_at, start, end));

  const comisionesPendientesMes = comisionesMes
    .filter((comision) => comision.estado === "pendiente")
    .reduce((total, comision) => total + comision.monto_comision, 0);

  const comisionesPagadasMes = comisionesMes
    .filter((comision) => comision.estado === "pagada")
    .reduce((total, comision) => total + comision.monto_comision, 0);

  const tasaConversion = userLeads.length > 0 ? (userClientes.length / userLeads.length) * 100 : null;

  return {
    user,
    leadsTotal: userLeads.length,
    leadsPorEtapa,
    clientesConvertidos: userClientes.length,
    ventasCerradasMes: ventasCerradas.length,
    ventasCerradasMontoMes: ventasCerradas.reduce((total, cotizacion) => total + (cotizacion.precio_total ?? 0), 0),
    comisionesPendientesMes,
    comisionesPagadasMes,
    tasaConversion
  };
}

export default async function EquipoComercialPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const supabase = createAdminClient();
  const [usuariosResult, leadsResult, clientesResult, cotizacionesResult, comisionesResult] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, foto_url, rol")
      .eq("activo", true)
      .eq("rol", "comercial")
      .order("nombre", { ascending: true }),
    supabase.from("leads").select("id, vendedor_id, etapa, created_at"),
    supabase.from("clientes").select("id, vendedor_id, lead_id, created_at"),
    supabase.from("cotizaciones").select("id, cliente_id, estado, precio_total, updated_at, created_at"),
    supabase.from("comisiones").select("id, vendedor_id, estado, monto_comision, created_at, pagada_at")
  ]);

  const errors = [usuariosResult.error, leadsResult.error, clientesResult.error, cotizacionesResult.error, comisionesResult.error].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudieron cargar las métricas comerciales.");
  }

  const users = (usuariosResult.data ?? []) as Array<Pick<Usuario, "id" | "nombre" | "foto_url" | "rol">>;
  const leads = (leadsResult.data ?? []) as Lead[];
  const clientes = (clientesResult.data ?? []) as Cliente[];
  const cotizaciones = (cotizacionesResult.data ?? []) as Cotizacion[];
  const comisiones = (comisionesResult.data ?? []) as Comision[];
  const metrics = users.map((user) => buildMetrics({ user, leads, clientes, cotizaciones, comisiones }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-title text-carbon">Equipo comercial</h1>
          <p className="text-sm text-graphite">Rendimiento de leads, cierres y comisiones por vendedor.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {metrics.map((metric) => (
            <Card key={metric.user.id} padding="md" className="space-y-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={metric.user.nombre} fotoUrl={metric.user.foto_url} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-title text-carbon">{metric.user.nombre}</h2>
                    <p className="text-sm text-graphite">Vendedor comercial</p>
                  </div>
                </div>
                <Badge variant="signal">comercial</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Leads generados" value={formatCount(metric.leadsTotal)} />
                <Stat label="Clientes convertidos" value={formatCount(metric.clientesConvertidos)} />
                <Stat
                  label="Ventas cerradas este mes"
                  value={`${formatCount(metric.ventasCerradasMes)} · ${formatUSD(metric.ventasCerradasMontoMes)}`}
                />
                <Stat label="Tasa de conversión" value={formatPercent(metric.tasaConversion)} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Leads por etapa</p>
                <div className="flex flex-wrap gap-2">
                  {metric.leadsPorEtapa.map((stage) => (
                    <Badge key={stage.etapa} variant="ghost" className="gap-1">
                      {stage.etapa}: {stage.cantidad}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Comisión pendiente del mes" value={formatUSD(metric.comisionesPendientesMes)} />
                <Stat label="Comisión pagada del mes" value={formatUSD(metric.comisionesPagadasMes)} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line-soft bg-paper p-4">
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      <p className="mt-2 text-lg font-title text-carbon">{value}</p>
    </div>
  );
}
