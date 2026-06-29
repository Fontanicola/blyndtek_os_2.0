import { DATOS_PROPUESTA_DEFAULT } from "@/lib/cotizador/defaults";
import { formatUSD } from "@/lib/utils/formatters";
import type { Beneficio, Cotizacion } from "@/types/cotizaciones";

type PropuestaPDFProps = {
  cotizacion: Cotizacion;
  fechaGeneracion: Date;
};

function Page({
  children,
  className = "",
  breakAfter = false,
  footer,
  cover = false
}: {
  children: React.ReactNode;
  className?: string;
  breakAfter?: boolean;
  footer: React.ReactNode;
  cover?: boolean;
}) {
  return (
    <section
      className={[
        "relative mx-auto min-h-[1123px] w-full bg-white px-12 py-10 text-[14px] text-carbon",
        breakAfter ? "page-break" : "",
        className
      ].join(" ")}
    >
      <div className={cover ? "min-h-[1053px]" : ""}>{children}</div>
      <div className="absolute bottom-8 left-12 right-12 border-t border-line-soft pt-3 text-[11px] text-graphite">
        {footer}
      </div>
    </section>
  );
}

function Kicker({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line-soft pb-4">
      <div>
        <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">{title}</p>
        <div className="mt-1 text-sm font-label text-carbon">{number}</div>
      </div>
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">{title}</p>
  );
}

function monthYear(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMonthYear(date: Date) {
  return capitalize(monthYear(date));
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function hasArrayItems<T>(items: T[] | null | undefined) {
  return Array.isArray(items) && items.length > 0;
}

function iconPath(icono: Beneficio["icono"]) {
  switch (icono) {
    case "automatizacion":
      return "M4 12h4l2-4 2 8 2-4h4";
    case "finanzas":
      return "M6 18V6m6 12V4m6 14v-8";
    case "fiscal":
      return "M6 5h12v14H6z M9 9h6M9 12h6M9 15h4";
    case "datos":
      return "M6 8h12M6 12h12M6 16h12";
    case "seguridad":
      return "M12 3l6 3v5c0 4.5-2.8 7.9-6 10-3.2-2.1-6-5.5-6-10V6l6-3z";
    case "soporte":
      return "M6 7h12v8H9l-3 3V7z";
    case "crecimiento":
    default:
      return "M5 15l4-4 3 3 5-7M15 7h2v2";
  }
}

function BenefitIcon({ icono }: { icono: Beneficio["icono"] }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-signal" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPath(icono)} />
    </svg>
  );
}

function pageFooter(cotizacion: Cotizacion, fechaGeneracion: Date) {
  return `Blyndtek · Propuesta · ${cotizacion.empresa} · ${formatMonthYear(fechaGeneracion)}`;
}

function momentoHito(nombre: string) {
  if (/anticipo/i.test(nombre)) {
    return "Firma y kickoff";
  }

  if (/avance|entrega|hito final|final/i.test(nombre)) {
    return "Avance de proyecto";
  }

  if (/mantenimiento/i.test(nombre)) {
    return "Inicio del servicio";
  }

  return "Según avance";
}

function SectionCard({
  title,
  children,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["rounded-card border border-line-soft p-5", className].join(" ")}>
      <div className="mb-4 border-b border-line-soft pb-2">
        <h3 className="text-sm font-label text-carbon">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-carbon">
          <span className="mt-[2px] text-signal">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PropuestaPDF({ cotizacion, fechaGeneracion }: PropuestaPDFProps) {
  const datos = cotizacion.datos_propuesta
    ? {
        ...DATOS_PROPUESTA_DEFAULT,
        ...cotizacion.datos_propuesta,
        firmantes: (cotizacion.datos_propuesta.firmantes ?? []).map((firmante) => ({
          ...firmante
        }))
      }
    : {
        ...DATOS_PROPUESTA_DEFAULT,
        preparado_para: cotizacion.empresa,
        firmantes: (DATOS_PROPUESTA_DEFAULT.firmantes ?? []).map((firmante) => ({
          ...firmante
        }))
      };
  const resumen = cotizacion.resumen_ejecutivo || "";
  const entendimiento = cotizacion.entendimiento || "";
  const hasEntendimiento = hasText(entendimiento);
  const hasResumen = hasText(resumen);
  const beneficios = cotizacion.beneficios ?? [];
  const modulos = cotizacion.modulos ?? [];
  const hitos = cotizacion.hitos ?? [];
  const condiciones = cotizacion.condiciones_comerciales ?? [];
  const supuestos = cotizacion.supuestos ?? [];
  const diferenciadores = cotizacion.por_que_nosotros ?? [];
  const mantenimientoDetalle = cotizacion.mantenimiento_detalle ?? null;
  const hasBeneficios = hasArrayItems(beneficios);
  const hasModulos = modulos.length > 0;
  const hasMantenimientoDetalle = Boolean(mantenimientoDetalle);
  const hasCondiciones = hasArrayItems(condiciones);
  const hasSupuestos = hasArrayItems(supuestos);
  const hasDiferenciadores = hasArrayItems(diferenciadores);
  const hasCondicionesOSupuestos = hasCondiciones || hasSupuestos;
  const totalWeeks = Math.max(cotizacion.plazo_semanas ?? 1, 1);
  const mantenimientoMensual = cotizacion.mantenimiento_mensual ?? 0;
  const firmantes = datos.firmantes ?? [];
  const monthYearLabel = formatMonthYear(fechaGeneracion);
  const footer = pageFooter(cotizacion, fechaGeneracion);
  const hasContacto = Boolean(
    datos &&
      (datos.email_contacto ||
        datos.telefono_contacto ||
        datos.instagram ||
        datos.linkedin)
  );

  return (
    <div className="bg-white">
      <Page breakAfter className="flex flex-col" footer={footer} cover>
        <div className="flex items-start justify-between gap-8">
          <div>
            <SectionLabel title="Propuesta de desarrollo de software" />
            <div className="mt-4 text-[32px] font-title tracking-[-0.03em] text-carbon">
              Blyndtek
            </div>
            <p className="mt-2 text-sm text-graphite">
              {datos?.preparado_por || "Blyndtek LLC"}
            </p>
          </div>

          <div className="max-w-[240px] text-right">
            <p className="text-xs font-label uppercase tracking-[0.16em] text-signal">
              Preparado para
            </p>
            <p className="mt-2 text-lg font-title text-carbon">
              {datos?.preparado_para || cotizacion.empresa}
            </p>
          </div>
        </div>

        <div className="mt-16 border-t border-signal pt-10">
          <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
            {monthYearLabel} · Validez {datos?.validez_dias ?? 30} días
          </p>

          <div className="mt-6 max-w-4xl">
            <h1 className="text-4xl font-title tracking-[-0.04em] text-carbon">
              {datos?.titulo_sistema || "Propuesta de solución a medida"}
            </h1>
            {datos?.subtitulo_sistema ? (
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-graphite">
                {datos.subtitulo_sistema}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-14 grid flex-1 gap-10">
          {firmantes.length > 0 ? (
            <div className="border-t border-line-soft pt-5">
              <p className="text-xs font-label uppercase tracking-[0.16em] text-graphite">
                Firmantes
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {firmantes.map((firmante) => (
                  <div
                    key={`${firmante.nombre}-${firmante.rol}`}
                    className="rounded-pill border border-line-soft px-4 py-2 text-sm text-carbon"
                  >
                    {firmante.nombre} · {firmante.rol}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-auto border-t border-line-soft pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-label text-carbon">Documento confidencial</p>
                <p className="mt-1 text-sm text-graphite">
                  Preparado para acompañar una decisión comercial clara y profesional.
                </p>
              </div>
              <p className="text-sm text-graphite">{monthYearLabel}</p>
            </div>
          </div>
        </div>
      </Page>

      <Page breakAfter footer={footer}>
        <Kicker number="1" title="Resumen ejecutivo" />
        <h2 className="text-2xl font-title tracking-[-0.03em] text-carbon">
          Entendimiento del proyecto
        </h2>

        {hasEntendimiento ? (
          <div className="mt-5 space-y-4 whitespace-pre-wrap text-base leading-relaxed text-carbon">
            {entendimiento}
          </div>
        ) : null}

        {hasBeneficios ? (
          <div className="mt-10">
            <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
              Qué resuelve la plataforma
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {beneficios.map((beneficio) => (
                <div key={`${beneficio.titulo}-${beneficio.icono}`} className="rounded-card border border-line-soft p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-pill border border-line-soft p-2">
                      <BenefitIcon icono={beneficio.icono} />
                    </div>
                    <div>
                      <h3 className="text-sm font-label text-carbon">{beneficio.titulo}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-graphite">
                        {beneficio.descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hasResumen ? (
          <div className="mt-10 border-t border-line-soft pt-6">
            <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
              Enfoque de la propuesta
            </p>
            <div className="mt-4 max-w-4xl whitespace-pre-wrap text-base leading-relaxed text-carbon">
              {resumen}
            </div>
          </div>
        ) : null}
      </Page>

      {hasModulos ? (
        <Page breakAfter footer={footer}>
          <Kicker number={`${cotizacion.modulos.length > 1 ? "2" : "2"} Módulos incluidos`} title="Alcance funcional" />
          <div className="space-y-8">
            {modulos.map((modulo, index) => (
              <div key={modulo.id} className="break-inside-avoid border-b border-line-soft pb-6 last:border-b-0">
                <div className="flex items-start gap-4">
                  <div className="min-w-[44px] pt-1 text-2xl font-title text-signal">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-title tracking-[-0.02em] text-carbon">
                      {modulo.nombre}
                    </h3>
                    <p className="mt-2 max-w-4xl text-sm leading-relaxed text-graphite">
                      {modulo.descripcion}
                    </p>
                  </div>
                </div>

                {modulo.features.length > 0 ? (
                  <div className="mt-5 grid gap-2 lg:grid-cols-2">
                    {modulo.features.map((feature) => (
                      <div key={`${modulo.id}-${feature}`} className="flex gap-2 text-sm text-carbon">
                        <span className="mt-[2px] text-signal">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Page>
      ) : null}

      <Page breakAfter footer={footer}>
        <Kicker number="3 Stack tecnológico y arquitectura" title="Tecnología" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: "Frontend",
              detail: "Next.js 14 (App Router) · TypeScript · Tailwind CSS"
            },
            {
              title: "Backend",
              detail: "Supabase (PostgreSQL + Auth + Edge Functions)"
            },
            {
              title: "Infraestructura",
              detail: "Vercel · Edge Functions · pg_cron"
            },
            {
              title: "Fiscal (ARCA)",
              detail: "Integraciones y flujos administrativos según aplique al proyecto"
            },
            {
              title: "Comunicaciones",
              detail: "Google Calendar API · email · notificaciones según necesidad"
            },
            {
              title: "Automatización",
              detail: "Jobs recurrentes y triggers para reducir tareas manuales"
            }
          ]
            .filter((item) => {
              if (item.title === "Fiscal (ARCA)") {
                return /arca|fiscal|impuesto|factur/i.test(
                  [cotizacion.empresa, cotizacion.entendimiento ?? "", cotizacion.resumen_ejecutivo ?? ""].join(" ")
                );
              }

              if (item.title === "Comunicaciones") {
                return /whatsapp|calendar|email|correo|notific/i.test(
                  [cotizacion.entendimiento ?? "", cotizacion.resumen_ejecutivo ?? "", modulos.map((m) => m.nombre).join(" ")].join(" ")
                );
              }

              if (item.title === "Automatización") {
                return true;
              }

              return true;
            })
            .map((item) => (
              <div key={item.title} className="rounded-card border border-line-soft p-4">
                <h3 className="text-sm font-label text-carbon">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite">{item.detail}</p>
              </div>
            ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SectionCard title="Seguridad y resguardo">
            <CheckList items={["HTTPS en toda la plataforma", "RLS y permisos por rol", "Backups y resguardo de datos", "Auditoría de cambios", "Redundancia en infraestructura"]} />
          </SectionCard>

          <SectionCard title="Metodología de trabajo">
            <p className="text-sm leading-relaxed text-carbon">
              El trabajo se organiza en entregas iterativas con validación frecuente, para que el
              cliente vea avances reales, pueda corregir rumbo temprano y llegue a producción con
              una solución alineada al negocio.
            </p>
          </SectionCard>
        </div>
      </Page>

      <Page breakAfter footer={footer}>
        <Kicker number="4 Propuesta económica" title="Inversión" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <p className="text-4xl font-title tracking-[-0.04em] text-carbon">
              {formatUSD(cotizacion.precio_total ?? 0)} · pago único
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-graphite">
              Incluye el diseño, desarrollo y puesta en marcha del alcance funcional definido en la
              propuesta.
            </p>

            {mantenimientoMensual > 0 ? (
              <div className="mt-8 rounded-card border border-line-soft p-5">
                <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
                  Servicio mensual
                </p>
                <p className="mt-3 text-2xl font-title text-carbon">
                  {formatUSD(mantenimientoMensual)}/mes
                </p>
                <p className="mt-2 text-sm text-graphite">Comienza al go-live.</p>
              </div>
            ) : null}
          </div>

          {hasArrayItems(cotizacion.hitos) ? (
            <div className="rounded-card border border-line-soft overflow-hidden">
              <div className="grid grid-cols-[1.6fr_1.2fr_0.7fr_1fr] bg-paper px-4 py-3 text-[11px] font-label uppercase tracking-[0.16em] text-graphite">
                <span>Hito</span>
                <span>Momento</span>
                <span>%</span>
                <span>Monto</span>
              </div>
              {hitos.map((hito, index) => (
                <div
                  key={hito.id}
                  className={[
                    "grid grid-cols-[1.6fr_1.2fr_0.7fr_1fr] px-4 py-3 text-sm",
                    index % 2 === 0 ? "bg-white" : "bg-paper"
                  ].join(" ")}
                >
                  <span className="font-label text-carbon">{hito.nombre}</span>
                  <span className="text-graphite">{momentoHito(hito.nombre)}</span>
                  <span className="text-carbon">{hito.pct}%</span>
                  <span className="text-carbon">{formatUSD(hito.monto)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {hasText(cotizacion.justificacion_precio) ? (
          <div className="mt-8 border-t border-line-soft pt-6">
            <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
              Sobre el valor de la inversión
            </p>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-carbon">
              {cotizacion.justificacion_precio}
            </p>
          </div>
        ) : null}

        <div className="mt-8 border-t border-line-soft pt-6">
          <p className="text-sm font-label text-carbon">
            Plazo de ejecución: {formatSemanasEquivalent(totalWeeks)}
          </p>
        </div>
      </Page>

      {hasMantenimientoDetalle ? (
        <Page breakAfter footer={footer}>
          <Kicker number="5 Qué incluye el mantenimiento mensual" title="Servicio mensual" />
          <p className="max-w-4xl text-sm leading-relaxed text-graphite">
            El abono mensual sostiene la continuidad operativa, permite acompañamiento y mantiene la
            solución actualizada para que el sistema siga aportando valor después del go-live.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {(mantenimientoDetalle?.incluye ?? []).map((categoria) => (
              <SectionCard key={categoria.categoria} title={categoria.categoria}>
                <CheckList items={categoria.items} />
              </SectionCard>
            ))}
          </div>

          {hasArrayItems(mantenimientoDetalle?.no_incluye) ? (
            <div className="mt-8 border-t border-line-soft pt-6">
              <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
                No incluido en el abono
              </p>
              <ul className="mt-4 space-y-2">
                {(mantenimientoDetalle?.no_incluye ?? []).map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-carbon">
                    <span className="mt-[2px] text-graphite">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Page>
      ) : null}

      {hasCondicionesOSupuestos ? (
        <Page breakAfter footer={footer}>
          <Kicker number="6 Condiciones comerciales" title="Condiciones" />
          {hasCondiciones ? (
            <CheckList items={condiciones} />
          ) : null}

          {hasSupuestos ? (
            <div className="mt-8 border-t border-line-soft pt-6">
              <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
                Supuestos del proyecto
              </p>
              <ul className="mt-4 space-y-2">
                {supuestos.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-carbon">
                    <span className="mt-[2px] text-graphite">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Page>
      ) : null}

      <Page footer={footer}>
        <Kicker number="7 Por qué Blyndtek" title="Cierre" />

        {hasDiferenciadores ? (
          <div className="grid gap-4 md:grid-cols-2">
            {diferenciadores.map((item) => (
              <div key={`${item.titulo}-${item.descripcion}`} className="rounded-card border border-line-soft p-5">
                <h3 className="text-sm font-label text-carbon">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite">{item.descripcion}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-card border border-line-soft p-5">
            <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
              Próximos pasos
            </p>
            <ol className="mt-4 space-y-3 text-sm text-carbon">
              <li>1. Validación final del alcance y ajustes menores.</li>
              <li>2. Firma de la propuesta y pago del primer hito.</li>
              <li>3. Kickoff de proyecto y planificación detallada.</li>
              <li>4. Desarrollo por fases con seguimiento iterativo.</li>
            </ol>
          </div>

          {hasContacto ? (
            <div className="rounded-card border border-line-soft p-5">
              <p className="text-xs font-label uppercase tracking-[0.18em] text-signal">
                Contacto
              </p>
              <div className="mt-4 space-y-3 text-sm text-carbon">
                {firmantes.length > 0 ? (
                  <div>
                    <p className="text-graphite">Firmantes</p>
                    <p className="mt-1">
                      {firmantes.map((firmante) => `${firmante.nombre} · ${firmante.rol}`).join(" / ")}
                    </p>
                  </div>
                ) : null}
                {datos?.email_contacto ? (
                  <p>
                    <span className="text-graphite">Email: </span>
                    {datos.email_contacto}
                  </p>
                ) : null}
                {datos?.telefono_contacto ? (
                  <p>
                    <span className="text-graphite">Teléfono: </span>
                    {datos.telefono_contacto}
                  </p>
                ) : null}
                {datos?.instagram ? (
                  <p>
                    <span className="text-graphite">Instagram: </span>
                    {datos.instagram}
                  </p>
                ) : null}
                {datos?.linkedin ? (
                  <p>
                    <span className="text-graphite">LinkedIn: </span>
                    {datos.linkedin}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-12 border-t border-line-soft pt-8">
          <h3 className="text-2xl font-title tracking-[-0.03em] text-carbon">
            Gracias por la confianza.
          </h3>
          <p className="mt-3 text-sm text-graphite">
            Quedamos a disposición para avanzar.
          </p>
        </div>
      </Page>
    </div>
  );
}

function formatSemanasEquivalent(totalWeeks: number) {
  const approxMonths = totalWeeks / 4;

  if (approxMonths < 1) {
    return `${totalWeeks} ${totalWeeks === 1 ? "semana" : "semanas"}`;
  }

  const rounded = Math.round(approxMonths * 10) / 10;
  const margin = rounded >= 3 ? "± 1 mes" : "± 2 semanas";

  return `${rounded} ${rounded === 1 ? "mes" : "meses"} ${margin}`;
}
