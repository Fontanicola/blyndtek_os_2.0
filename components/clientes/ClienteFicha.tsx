"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Modal, Toast } from "@/components/ui";
import { CobroModal, EgresoModal, MetricaCard } from "@/components/finanzas";
import { DashboardIcon, FinanzasIcon } from "@/components/icons";
import { NotasVinculadasSection } from "@/components/notas";
import { ProyectoCard } from "@/components/proyectos";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import { useFinanzas } from "@/lib/hooks/useFinanzas";
import { useProyectos } from "@/lib/hooks/useProyectos";
import { LeadNegociacionesSection } from "@/components/leads/LeadNegociacionesSection";
import type { Cobro } from "@/types/cobros";
import type { CreateEgresoInput, Egreso } from "@/types/egresos";
import type { CobroModalInput } from "@/components/finanzas/CobroModal";
import type { Cliente, DatosFacturacion, EstadoCliente, UpdateClienteInput } from "@/types/clientes";
import type { Lead } from "@/types/leads";
import type { Producto } from "@/types/productos";
import type { ProductoPlan } from "@/types/productoPlanes";
import type { Proyecto } from "@/types/proyectos";
import type { Contrato, ContratoDetalle, CreateContratoInput } from "@/types/contratos";
import type { Suscripcion } from "@/types/suscripciones";
import { ClienteRentabilidadChart } from "./ClienteRentabilidadChart";

type ClienteFichaProps = {
  cliente: Cliente;
  onUpdate: (input: UpdateClienteInput) => void | Promise<void>;
};

type TabKey = "datos" | "proyectos" | "contrato" | "financiero" | "cobros" | "suscripcion" | "historial";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "datos", label: "Datos generales" },
  { key: "proyectos", label: "Proyectos" },
  { key: "contrato", label: "Contrato" },
  { key: "financiero", label: "Financiero" },
  { key: "cobros", label: "Cobros" },
  { key: "suscripcion", label: "Suscripción" },
  { key: "historial", label: "Historial" }
];

type ClienteRentabilidadPoint = {
  mes: string;
  ingresos: number;
  costos: number;
  margen: number;
};

type ClienteRentabilidadData = {
  ingreso_mensual_recurrente: number;
  ingreso_cobrado_periodo: number;
  costo_mensual: number;
  margen_mensual: number;
  margen_pct: number | null;
  historico_6_meses: ClienteRentabilidadPoint[];
};

type ContractFormState = {
  valor_total: string;
  cantidad_cuotas: string;
  dia_pago: string;
  fecha_primera_cuota: string;
  valor_mantenimiento_mensual: string;
  dia_facturacion_mantenimiento: string;
  motivo_redefinicion: string;
};

const emptyContractForm = (): ContractFormState => ({
  valor_total: "",
  cantidad_cuotas: "",
  dia_pago: "",
  fecha_primera_cuota: "",
  valor_mantenimiento_mensual: "",
  dia_facturacion_mantenimiento: "",
  motivo_redefinicion: ""
});

function contractFormFromData(contrato: Contrato | null): ContractFormState {
  if (!contrato) {
    return emptyContractForm();
  }

  return {
    valor_total: String(contrato.valor_total),
    cantidad_cuotas: String(contrato.cantidad_cuotas),
    dia_pago: String(contrato.dia_pago),
    fecha_primera_cuota: contrato.fecha_primera_cuota,
    valor_mantenimiento_mensual:
      contrato.valor_mantenimiento_mensual != null ? String(contrato.valor_mantenimiento_mensual) : "",
    dia_facturacion_mantenimiento:
      contrato.dia_facturacion_mantenimiento != null ? String(contrato.dia_facturacion_mantenimiento) : "",
    motivo_redefinicion: contrato.motivo_redefinicion ?? ""
  };
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function InlineText({
  label,
  value,
  onSave,
  multiline = false,
  type = "text",
  placeholder = "Sin dato"
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
  multiline?: boolean;
  type?: "text" | "email";
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? "");
    }
  }, [editing, value]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    onSave(trimmed ? trimmed : null);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        ) : (
          <Input
            autoFocus
            type={type}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-component px-2 py-1 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
        >
          {value || <span className="text-graphite">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card padding="lg" className="border border-dashed border-line bg-paper">
      <p className="text-sm text-graphite">{text}</p>
    </Card>
  );
}

function CobroBadge({ estado }: { estado: Cobro["estado"] }) {
  const variant =
    estado === "cobrado" ? "success" : estado === "vencido" ? "danger" : estado === "facturado" ? "signal" : "default";

  return <Badge variant={variant}>{estado}</Badge>;
}

function SuscripcionBadge({ estado }: { estado: Suscripcion["estado"] }) {
  const variant =
    estado === "activa" ? "success" : estado === "pausada" ? "warning" : estado === "baja" ? "danger" : "default";

  return <Badge variant={variant}>{estado}</Badge>;
}

const estadoLabels: Record<EstadoCliente, string> = {
  activo: "Activo",
  pausado: "Pausado",
  inactivo: "Inactivo"
};

const estadoVariants: Record<EstadoCliente, "success" | "warning" | "default"> = {
  activo: "success",
  pausado: "warning",
  inactivo: "default"
};

const egresoCategoriaLabels: Record<Egreso["categoria"], string> = {
  dominios: "Dominios",
  hosting_infraestructura: "Hosting / Infraestructura",
  herramientas_software: "Herramientas / Software",
  marketing_ads: "Marketing / Ads",
  impuestos_contable: "Impuestos / Contable",
  sueldos_honorarios: "Sueldos / Honorarios",
  comisiones: "Comisiones",
  otro: "Otro"
};

export function ClienteFicha({ cliente, onUpdate }: ClienteFichaProps) {
  const router = useRouter();
  const { fetchProyectos } = useProyectos();
  const { fetchCobros, fetchCobro, fetchSuscripciones, createSuscripcion, activarSuscripcion, updateCobro } = useFinanzas();
  const [activeTab, setActiveTab] = useState<TabKey>("datos");
  const [notaDraft, setNotaDraft] = useState("");
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [egresosCliente, setEgresosCliente] = useState<Egreso[]>([]);
  const [contratoDetalle, setContratoDetalle] = useState<ContratoDetalle | null>(null);
  const [rentabilidad, setRentabilidad] = useState<ClienteRentabilidadData | null>(null);
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [selectedEgresoDefaults, setSelectedEgresoDefaults] = useState<Partial<CreateEgresoInput> | null>(null);
  const [expandedCobros, setExpandedCobros] = useState<Record<string, boolean>>({});
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [planes, setPlanes] = useState<ProductoPlan[]>([]);
  const [leadOrigen, setLeadOrigen] = useState<Lead | null>(null);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState("");
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState("");
  const [montoDraft, setMontoDraft] = useState("");
  const [montoEditable, setMontoEditable] = useState(false);
  const [contratoForm, setContratoForm] = useState<ContractFormState>(() => emptyContractForm());
  const [contratoEditing, setContratoEditing] = useState(false);
  const [contratoConfirmOpen, setContratoConfirmOpen] = useState(false);
  const [savingContrato, setSavingContrato] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [creatingSuscripcion, setCreatingSuscripcion] = useState(false);
  const [creatingCosto, setCreatingCosto] = useState(false);
  const [tabLoading, setTabLoading] = useState<TabKey | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "warning" | "error";
    visible: boolean;
  }>({
    message: "",
    type: "success",
    visible: false
  });

  const notes = useMemo(() => {
    return (cliente.notas ?? "")
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [cliente.notas]);

  const cobrosResumen = useMemo(() => {
    return cobros.reduce(
      (accumulator, cobro) => {
        if (cobro.estado === "cobrado") {
          accumulator.cobrado += cobro.monto;
        }
        if (cobro.estado === "pendiente") {
          accumulator.pendiente += cobro.monto;
        }
        if (cobro.estado === "vencido") {
          accumulator.vencido += cobro.monto;
        }
        return accumulator;
      },
      { cobrado: 0, pendiente: 0, vencido: 0 }
    );
  }, [cobros]);

  const contratoActivo = contratoDetalle?.contrato ?? null;
  const contratoResumen = contratoDetalle?.cobros_resumen ?? {
    cobrado: { cantidad: 0, monto: 0 },
    pendiente: { cantidad: 0, monto: 0 },
    facturado: { cantidad: 0, monto: 0 },
    vencido: { cantidad: 0, monto: 0 },
    total: { cantidad: 0, monto: 0 }
  };
  const contratoPendienteMonto =
    contratoResumen.pendiente.monto + contratoResumen.facturado.monto + contratoResumen.vencido.monto;
  const contratoCuotasPendientes =
    contratoResumen.pendiente.cantidad + contratoResumen.facturado.cantidad + contratoResumen.vencido.cantidad;
  const contratoProgresoPct = contratoActivo
    ? Math.min(100, Math.round((contratoResumen.cobrado.monto / contratoActivo.valor_total) * 100))
    : 0;
  const contratoImpacto = contratoActivo
    ? {
        cobradas: contratoResumen.cobrado.cantidad,
        montoCobradas: contratoResumen.cobrado.monto,
        pendientes: contratoCuotasPendientes,
        montoPendiente: contratoPendienteMonto,
        nuevoValorTotal: Number(contratoForm.valor_total) || contratoActivo.valor_total,
        nuevasCuotas: Number(contratoForm.cantidad_cuotas) || contratoActivo.cantidad_cuotas
      }
    : null;

  const proyectoActivoParaCosto = useMemo(
    () =>
      proyectos.find((proyecto) => proyecto.estado === "en_desarrollo" || proyecto.estado === "implementacion") ??
      proyectos[0] ??
      null,
    [proyectos]
  );

  const suscripcionProducto = useMemo(
    () => productos.find((producto) => producto.id === suscripcion?.producto_id) ?? null,
    [productos, suscripcion?.producto_id]
  );

  const suscripcionPlan = useMemo(
    () => planes.find((plan) => plan.id === suscripcion?.plan_id) ?? null,
    [planes, suscripcion?.plan_id]
  );

  const formSelectedProducto = useMemo(
    () => productos.find((producto) => producto.id === productoSeleccionadoId) ?? null,
    [productos, productoSeleccionadoId]
  );

  const formSelectedPlan = useMemo(
    () => planes.find((plan) => plan.id === planSeleccionadoId) ?? null,
    [planes, planSeleccionadoId]
  );

  const rentabilidadHistorico = rentabilidad?.historico_6_meses ?? [];
  const costosCargados = egresosCliente.length > 0;

  function updateFacturacion(field: keyof DatosFacturacion, value: string | null) {
    void onUpdate({
      datos_facturacion: {
        ...(cliente.datos_facturacion ?? {}),
        [field]: value ?? undefined
      }
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTabData() {
      setTabError(null);

      try {
        if (activeTab === "proyectos") {
          setTabLoading("proyectos");
          const data = await fetchProyectos({ cliente_id: cliente.id });
          if (!cancelled) {
            setProyectos(data);
          }
        }

        if (activeTab === "contrato") {
          setTabLoading("contrato");
          const response = await fetch(`/api/clientes/${cliente.id}/contrato`);
          const payload = (await response.json()) as { data?: ContratoDetalle; error?: string };

          if (!response.ok || !payload.data) {
            throw new Error(payload.error ?? "No se pudo cargar el contrato.");
          }

          if (!cancelled) {
            setContratoDetalle(payload.data);
            setContratoEditing(false);
            setContratoConfirmOpen(false);
            setContratoForm(contractFormFromData(payload.data.contrato));
          }
        }

        if (activeTab === "financiero") {
          setTabLoading("financiero");
          const [proyectosData, costosResponse, rentabilidadResponse] = await Promise.all([
            fetchProyectos({ cliente_id: cliente.id }),
            fetch(`/api/clientes/${cliente.id}/costos`),
            fetch(`/api/clientes/${cliente.id}/rentabilidad?period=month`)
          ]);

          const costosPayload = (await costosResponse.json()) as { data?: Egreso[]; error?: string };
          const rentabilidadPayload = (await rentabilidadResponse.json()) as {
            data?: ClienteRentabilidadData;
            error?: string;
          };

          if (!costosResponse.ok || !costosPayload.data) {
            throw new Error(costosPayload.error ?? "No se pudieron cargar los costos del cliente.");
          }

          if (!rentabilidadResponse.ok || !rentabilidadPayload.data) {
            throw new Error(rentabilidadPayload.error ?? "No se pudo cargar la rentabilidad del cliente.");
          }

          if (!cancelled) {
            setProyectos(proyectosData);
            setEgresosCliente(costosPayload.data);
            setRentabilidad(rentabilidadPayload.data);
          }
        }

        if (activeTab === "cobros") {
          setTabLoading("cobros");
          const data = await fetchCobros({ cliente_id: cliente.id });
          if (!cancelled) {
            setCobros(data);
          }
        }

        if (activeTab === "suscripcion") {
          setTabLoading("suscripcion");
          const data = await fetchSuscripciones({ cliente_id: cliente.id });
          if (!cancelled) {
            setSuscripcion(data[0] ?? null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTabError(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
        }
      } finally {
        if (!cancelled) {
          setTabLoading(null);
        }
      }
    }

    void loadTabData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, cliente.id, fetchCobros, fetchProyectos, fetchSuscripciones]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeadOrigen() {
      if (!cliente.lead_id) {
        setLeadOrigen(null);
        return;
      }

      try {
        const response = await fetch(`/api/leads/${cliente.lead_id}`);
        const payload = (await response.json()) as { data?: Lead; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar el lead de origen.");
        }

        if (!cancelled) {
          setLeadOrigen(payload.data);
        }
      } catch {
        if (!cancelled) {
          setLeadOrigen(null);
        }
      }
    }

    void loadLeadOrigen();

    return () => {
      cancelled = true;
    };
  }, [cliente.lead_id]);

  useEffect(() => {
    if (activeTab !== "suscripcion") {
      return;
    }

    let cancelled = false;

    async function loadProductos() {
      setLoadingProductos(true);

      try {
        const response = await fetch("/api/productos");
        const payload = (await response.json()) as { data?: Producto[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los productos.");
        }

        if (!cancelled) {
          setProductos(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setTabError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProductos(false);
        }
      }
    }

    void loadProductos();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "suscripcion") {
      return;
    }

    const nextProductoId = suscripcion ? suscripcion.producto_id ?? "" : productos[0]?.id ?? "";
    if (nextProductoId && nextProductoId !== productoSeleccionadoId) {
      setProductoSeleccionadoId(nextProductoId);
      return;
    }

    if (!nextProductoId) {
      setProductoSeleccionadoId("");
      setPlanes([]);
      setPlanSeleccionadoId("");
      setMontoDraft("");
      setMontoEditable(false);
    }
  }, [activeTab, productos, productoSeleccionadoId, suscripcion]);

  useEffect(() => {
    if (activeTab !== "suscripcion" || !productoSeleccionadoId) {
      setPlanes([]);
      setPlanSeleccionadoId("");
      if (!productoSeleccionadoId) {
        setMontoDraft("");
        setMontoEditable(false);
      }
      return;
    }

    let cancelled = false;

    async function loadPlanes() {
      setLoadingPlanes(true);

      try {
        const response = await fetch(`/api/productos/${productoSeleccionadoId}/planes`);
        const payload = (await response.json()) as { data?: ProductoPlan[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los planes.");
        }

        if (cancelled) {
          return;
        }

        setPlanes(payload.data);

        const nextPlanId = suscripcion?.plan_id ?? payload.data[0]?.id ?? "";
        setPlanSeleccionadoId(nextPlanId);

        if (nextPlanId) {
          const selectedPlan = payload.data.find((plan) => plan.id === nextPlanId) ?? null;
          if (selectedPlan) {
            setMontoDraft(String(selectedPlan.precio_mensual));
            setMontoEditable(false);
          }
        } else {
          setMontoEditable(true);
          setMontoDraft("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setTabError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los planes.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPlanes(false);
        }
      }
    }

    void loadPlanes();

    return () => {
      cancelled = true;
    };
  }, [activeTab, productoSeleccionadoId, suscripcion]);

  async function handleCreateSaaSSubscription() {
    if (!productoSeleccionadoId || !formSelectedProducto) {
      return;
    }

    const monto = Number(montoDraft);

    if (Number.isNaN(monto) || monto < 0) {
      setTabError("Ingresá un monto mensual válido.");
      return;
    }

    setCreatingSuscripcion(true);
    setTabError(null);

    try {
      const created = await createSuscripcion({
        cliente_id: cliente.id,
        cotizacion_id: null,
        proyecto_id: null,
        producto_id: productoSeleccionadoId,
        plan_id: planSeleccionadoId || null,
        tipo: "brick",
        monto_mensual: monto,
        ciclo: "mensual",
        estado: "pendiente"
      });

      setSuscripcion(created);
      setToast({
        message: "Suscripción SaaS creada correctamente.",
        type: "success",
        visible: true
      });
    } catch (createError) {
      setTabError(createError instanceof Error ? createError.message : "No se pudo crear la suscripción.");
    } finally {
      setCreatingSuscripcion(false);
    }
  }

  async function handleActivateSubscription() {
    if (!suscripcion) {
      return;
    }

    setActivating(true);

    try {
      const updated = await activarSuscripcion(suscripcion.id);
      setSuscripcion(updated);
      setToast({
        message: "Suscripción activada correctamente.",
        type: "success",
        visible: true
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudo activar la suscripción.",
        type: "error",
        visible: true
      });
    } finally {
      setActivating(false);
    }
  }

  function startContractRedefinition() {
    if (!contratoActivo) {
      return;
    }

    setContratoEditing(true);
    setContratoConfirmOpen(false);
    setContratoForm(contractFormFromData(contratoActivo));
  }

  function cancelContractEditing() {
    setContratoEditing(false);
    setContratoConfirmOpen(false);
    setContratoForm(contractFormFromData(contratoActivo));
  }

  async function persistContrato(input: CreateContratoInput) {
    setSavingContrato(true);
    setTabError(null);

    try {
      const response = await fetch(`/api/clientes/${cliente.id}/contrato`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as { data?: ContratoDetalle & { resumen?: unknown }; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo generar el contrato.");
      }

      const refreshed = await fetch(`/api/clientes/${cliente.id}/contrato`);
      const refreshedPayload = (await refreshed.json()) as { data?: ContratoDetalle; error?: string };

      if (!refreshed.ok || !refreshedPayload.data) {
        throw new Error(refreshedPayload.error ?? "No se pudo recargar el contrato.");
      }

      setContratoDetalle(refreshedPayload.data);
      setContratoEditing(false);
      setContratoConfirmOpen(false);
      setContratoForm(contractFormFromData(refreshedPayload.data.contrato));
      setToast({
        message: contratoActivo ? "Contrato redefinido correctamente." : "Plan de pago generado correctamente.",
        type: "success",
        visible: true
      });
    } catch (error) {
      setTabError(error instanceof Error ? error.message : "No se pudo guardar el contrato.");
    } finally {
      setSavingContrato(false);
    }
  }

  async function handleContractSubmit() {
    const valorTotal = Number(contratoForm.valor_total);
    const cantidadCuotas = Number(contratoForm.cantidad_cuotas);
    const diaPago = Number(contratoForm.dia_pago);
    const valorMantenimientoMensual = contratoForm.valor_mantenimiento_mensual.trim()
      ? Number(contratoForm.valor_mantenimiento_mensual)
      : null;
    const diaFacturacionMantenimiento = contratoForm.dia_facturacion_mantenimiento.trim()
      ? Number(contratoForm.dia_facturacion_mantenimiento)
      : null;
    const diaFacturacionMantenimientoValidado = diaFacturacionMantenimiento ?? NaN;

    if (Number.isNaN(valorTotal) || valorTotal <= 0) {
      setTabError("Ingresá un valor total válido.");
      return;
    }

    if (!Number.isInteger(cantidadCuotas) || cantidadCuotas < 1) {
      setTabError("La cantidad de cuotas debe ser al menos 1.");
      return;
    }

    if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 28) {
      setTabError("El día de pago debe estar entre 1 y 28.");
      return;
    }

    if (!contratoForm.fecha_primera_cuota.trim()) {
      setTabError("Ingresá la fecha de la primera cuota.");
      return;
    }

    if (valorMantenimientoMensual != null && (Number.isNaN(valorMantenimientoMensual) || valorMantenimientoMensual < 0)) {
      setTabError("Ingresá un valor de mantenimiento válido.");
      return;
    }

    if (valorMantenimientoMensual != null && valorMantenimientoMensual > 0) {
      if (
        !Number.isInteger(diaFacturacionMantenimientoValidado) ||
        diaFacturacionMantenimientoValidado < 1 ||
        diaFacturacionMantenimientoValidado > 28
      ) {
        setTabError("El día de facturación del mantenimiento debe estar entre 1 y 28.");
        return;
      }
    }

    const payload: CreateContratoInput = {
      valor_total: valorTotal,
      cantidad_cuotas: cantidadCuotas,
      dia_pago: diaPago,
      fecha_primera_cuota: contratoForm.fecha_primera_cuota.trim(),
      valor_mantenimiento_mensual:
        valorMantenimientoMensual != null && valorMantenimientoMensual > 0 ? valorMantenimientoMensual : null,
      dia_facturacion_mantenimiento:
        valorMantenimientoMensual != null && valorMantenimientoMensual > 0 ? diaFacturacionMantenimientoValidado : null,
      motivo_redefinicion: contratoForm.motivo_redefinicion.trim() || null
    };

    if (contratoActivo && contratoEditing && !contratoConfirmOpen) {
      setContratoConfirmOpen(true);
      return;
    }

    await persistContrato(payload);
  }

  async function handleOpenCobroHistory(cobro: Cobro) {
    if (expandedCobros[cobro.id]) {
      setExpandedCobros((current) => ({
        ...current,
        [cobro.id]: false
      }));
      return;
    }

    try {
      const detailedCobro = cobro.historial ? cobro : await fetchCobro(cobro.id);
      setCobros((current) => current.map((item) => (item.id === cobro.id ? detailedCobro : item)));

      if ((detailedCobro.historial?.length ?? 0) > 0) {
        setExpandedCobros((current) => ({
          ...current,
          [cobro.id]: true
        }));
      }
    } catch (error) {
      setTabError(error instanceof Error ? error.message : "No se pudo cargar el historial del cobro.");
    }
  }

  function handleEditCobro(cobro: Cobro) {
    setSelectedCobro(cobro);
    setCobroModalOpen(true);
  }

  function handleOpenCostoModal() {
    setSelectedEgresoDefaults(
      proyectoActivoParaCosto
        ? {
            proyecto_id: proyectoActivoParaCosto.id,
            fecha: new Date().toISOString().slice(0, 10),
            recurrente: false,
            pagado: false
          }
        : {
            fecha: new Date().toISOString().slice(0, 10),
            recurrente: false,
            pagado: false
          }
    );
    setEgresoModalOpen(true);
  }

  function closeCostoModal() {
    setEgresoModalOpen(false);
    setSelectedEgresoDefaults(null);
  }

  async function handleSaveCosto(input: CreateEgresoInput) {
    setTabError(null);
    setCreatingCosto(true);

    try {
      const response = await fetch(`/api/clientes/${cliente.id}/costos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...input,
          proyecto_id: input.proyecto_id?.trim() || null
        })
      });
      const payload = (await response.json()) as { data?: Egreso; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear el costo.");
      }

      setEgresosCliente((current) => [payload.data!, ...current]);
      setToast({
        message: "Costo agregado correctamente.",
        type: "success",
        visible: true
      });
      setEgresoModalOpen(false);
      setSelectedEgresoDefaults(null);

      const refresh = await fetch(`/api/clientes/${cliente.id}/rentabilidad?period=month`);
      const refreshPayload = (await refresh.json()) as { data?: ClienteRentabilidadData; error?: string };

      if (refresh.ok && refreshPayload.data) {
        setRentabilidad(refreshPayload.data);
      }
    } catch (error) {
      setTabError(error instanceof Error ? error.message : "No se pudo crear el costo.");
    } finally {
      setCreatingCosto(false);
    }
  }

  async function handleSaveCobro(input: CobroModalInput) {
    if (!selectedCobro) {
      return;
    }

    setTabError(null);

    try {
      await updateCobro(selectedCobro.id, input);
      const detailedCobro = await fetchCobro(selectedCobro.id);
      setCobros((current) => current.map((item) => (item.id === selectedCobro.id ? detailedCobro : item)));
      setToast({
        message: "Cobro actualizado correctamente.",
        type: "success",
        visible: true
      });
      setCobroModalOpen(false);
      setSelectedCobro(null);
    } catch (error) {
      setTabError(error instanceof Error ? error.message : "No se pudo actualizar el cobro.");
    }
  }

  const contratoFormulario = (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Valor total del contrato"
          type="number"
          inputMode="decimal"
          value={contratoForm.valor_total}
          onChange={(event) => setContratoForm((current) => ({ ...current, valor_total: event.target.value }))}
          required
          hint="Monto total del plan en USD."
        />

        <Input
          label="Cantidad de cuotas"
          type="number"
          inputMode="numeric"
          value={contratoForm.cantidad_cuotas}
          onChange={(event) => setContratoForm((current) => ({ ...current, cantidad_cuotas: event.target.value }))}
          required
          hint="Cada cuota se genera como cobro independiente."
        />

        <Input
          label="Día de pago"
          type="number"
          inputMode="numeric"
          value={contratoForm.dia_pago}
          onChange={(event) => setContratoForm((current) => ({ ...current, dia_pago: event.target.value }))}
          required
          hint="Entre 1 y 28 para evitar saltos de calendario."
        />

        <Input
          label="Fecha de la primera cuota"
          type="date"
          value={contratoForm.fecha_primera_cuota}
          onChange={(event) => setContratoForm((current) => ({ ...current, fecha_primera_cuota: event.target.value }))}
          required
        />

        <Input
          label="Valor de mantenimiento mensual"
          type="number"
          inputMode="decimal"
          value={contratoForm.valor_mantenimiento_mensual}
          onChange={(event) =>
            setContratoForm((current) => ({ ...current, valor_mantenimiento_mensual: event.target.value }))
          }
          hint="Opcional. Dejalo vacío o en 0 si no aplica."
        />

        <Input
          label="Día de facturación del mantenimiento"
          type="number"
          inputMode="numeric"
          value={contratoForm.dia_facturacion_mantenimiento}
          onChange={(event) =>
            setContratoForm((current) => ({ ...current, dia_facturacion_mantenimiento: event.target.value }))
          }
          hint="Solo si hay mantenimiento. Entre 1 y 28."
          disabled={!contratoForm.valor_mantenimiento_mensual.trim() || Number(contratoForm.valor_mantenimiento_mensual) <= 0}
        />
      </div>

      {contratoActivo && contratoEditing ? (
        <div className="rounded-card border border-warning bg-warning-light px-4 py-3 text-sm text-carbon">
          Al confirmar la redefinición, las cuotas ya cobradas quedan intactas y solo se reemplazan las pendientes.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("cobros")}
          className="text-sm text-signal transition-colors duration-fast ease-fast hover:text-signal-hover"
        >
          Ver cuotas y editarlas individualmente
        </button>

        <div className="flex flex-wrap gap-2">
          {contratoActivo && contratoEditing ? (
            <Button variant="ghost" onClick={cancelContractEditing}>
              Cancelar
            </Button>
          ) : null}

          <Button
            variant={contratoActivo ? "secondary" : "primary"}
            loading={savingContrato}
            onClick={() => {
              void handleContractSubmit();
            }}
          >
            {contratoActivo && contratoEditing ? "Redefinir contrato" : "Generar plan de pago"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-line-soft pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
              activeTab === tab.key
                ? "bg-signal-light text-signal"
                : "text-graphite hover:bg-white hover:text-carbon"
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabError ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {tabError}
        </div>
      ) : null}

      {activeTab === "datos" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card padding="lg" className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-title text-carbon">{cliente.empresa}</h2>
                <Badge variant={estadoVariants[cliente.estado]}>
                  {estadoLabels[cliente.estado]}
                </Badge>
              </div>
              <p className="text-sm text-graphite">{cliente.pais ?? "Sin país"}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Contacto</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <InlineText
                  label="Nombre"
                  value={cliente.contacto_nombre}
                  onSave={(value) => void onUpdate({ contacto_nombre: value })}
                />
                <div>
                  <InlineText
                    label="Email"
                    type="email"
                    value={cliente.contacto_email}
                    onSave={(value) => void onUpdate({ contacto_email: value })}
                  />
                  {cliente.contacto_email ? (
                    <a
                      href={`mailto:${cliente.contacto_email}`}
                      className="mt-1 inline-flex text-sm text-signal"
                    >
                      {cliente.contacto_email}
                    </a>
                  ) : null}
                </div>
                <div>
                  <InlineText
                    label="WhatsApp"
                    value={cliente.contacto_whatsapp}
                    onSave={(value) => void onUpdate({ contacto_whatsapp: value })}
                  />
                  {cliente.contacto_whatsapp ? (
                    <a
                      href={`https://wa.me/${cliente.contacto_whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm text-signal"
                    >
                      Abrir WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Notas</h3>
              <InlineText
                label="Notas"
                value={cliente.notas}
                onSave={(value) => void onUpdate({ notas: value })}
                multiline
              />
            </section>
          </Card>

          <Card padding="lg" className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Datos de facturación</h3>
              <InlineText
                label="CUIT"
                value={cliente.datos_facturacion?.cuit ?? null}
                onSave={(value) => updateFacturacion("cuit", value)}
              />
              <InlineText
                label="Razón social"
                value={cliente.datos_facturacion?.razon_social ?? null}
                onSave={(value) => updateFacturacion("razon_social", value)}
              />
              <InlineText
                label="Dirección"
                value={cliente.datos_facturacion?.direccion ?? null}
                onSave={(value) => updateFacturacion("direccion", value)}
              />
              <InlineText
                label="Condición IVA"
                value={cliente.datos_facturacion?.condicion_iva ?? null}
                onSave={(value) => updateFacturacion("condicion_iva", value)}
              />
            </section>

          <section className="space-y-2">
            <h3 className="text-sm font-title text-carbon">Lead de origen</h3>
            <p className="text-sm text-graphite">
              {cliente.lead_id ? "Ver lead →" : "Sin lead de origen"}
            </p>
          </section>

          {leadOrigen ? <LeadNegociacionesSection lead={leadOrigen} /> : null}

          <NotasVinculadasSection
            entityType="cliente"
            entityId={cliente.id}
            entityLabel={cliente.empresa}
            href={`/clientes?cliente_id=${cliente.id}`}
          />

          <div className="space-y-2 pt-2">
            <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Estado</p>
              <select
                value={cliente.estado}
                onChange={(event) => void onUpdate({ estado: event.target.value as EstadoCliente })}
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "proyectos" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "proyectos" ? (
            <p className="text-sm text-graphite">Cargando proyectos...</p>
          ) : proyectos.length > 0 ? (
            <div className="grid gap-4">
              {proyectos.map((proyecto) => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  clienteNombre={cliente.empresa}
                  onClick={() => router.push("/proyectos")}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="Este cliente no tiene proyectos todavía." />
          )}
        </Card>
      ) : null}

      {activeTab === "contrato" ? (
        <Card padding="lg" className="space-y-5">
          {tabLoading === "contrato" ? (
            <p className="text-sm text-graphite">Cargando contrato...</p>
          ) : contratoActivo ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Valor total</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(contratoActivo.valor_total)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Cuotas</p>
                  <p className="text-lg font-title text-carbon">{contratoActivo.cantidad_cuotas}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Cobrado</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(contratoResumen.cobrado.monto)}</p>
                  <p className="text-xs text-graphite">
                    {contratoResumen.cobrado.cantidad} de {contratoActivo.cantidad_cuotas} cuotas
                  </p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Mantenimiento</p>
                  <p className="text-lg font-title text-carbon">
                    {contratoActivo.valor_mantenimiento_mensual != null
                      ? formatUSD(contratoActivo.valor_mantenimiento_mensual)
                      : "Sin mantenimiento"}
                  </p>
                  <p className="text-xs text-graphite">
                    {contratoActivo.dia_facturacion_mantenimiento != null
                      ? `Factura el día ${contratoActivo.dia_facturacion_mantenimiento}`
                      : "Sin día de facturación"}
                  </p>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  <span>Avance del plan</span>
                  <span>{contratoProgresoPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-signal transition-all duration-fast ease-fast"
                    style={{ width: `${contratoProgresoPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-graphite">
                  <span>{formatUSD(contratoResumen.cobrado.monto)} cobrados</span>
                  <span>{formatUSD(contratoPendienteMonto)} pendientes / por facturar</span>
                </div>
              </div>

              {contratoEditing ? contratoFormulario : null}

              {!contratoEditing ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={startContractRedefinition}
                    className="rounded-component border border-line bg-white px-4 py-2 text-sm font-label text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                  >
                    Redefinir contrato
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("cobros")}
                    className="text-sm text-signal transition-colors duration-fast ease-fast hover:text-signal-hover"
                  >
                    Ver cuotas y editarlas individualmente
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-base font-title text-carbon">Generar contrato</h3>
                <p className="text-sm text-graphite">
                  Definí el plan completo del cliente una sola vez. Las cuotas se generan automáticamente.
                </p>
              </div>

              {contratoFormulario}
            </div>
          )}
        </Card>
      ) : null}

      {activeTab === "cobros" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "cobros" ? (
            <p className="text-sm text-graphite">Cargando cobros...</p>
          ) : cobros.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Cobrado</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.cobrado)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Pendiente</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.pendiente)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Vencido</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.vencido)}</p>
                </Card>
              </div>

              <div className="overflow-hidden rounded-card border border-line-soft">
                <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto] gap-3 border-b border-line-soft bg-paper px-4 py-3 text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  <span>Concepto</span>
                  <span>Tipo</span>
                  <span>Monto</span>
                  <span>Vencimiento</span>
                  <span>Estado</span>
                  <span className="sr-only">Acciones</span>
                </div>
                <div className="divide-y divide-line-soft bg-white">
                  {cobros.map((cobro) => {
                    const historial = cobro.historial ?? [];
                    const isExpanded = expandedCobros[cobro.id] && historial.length > 0;

                    return (
                      <div key={cobro.id} className="border-b border-line-soft last:border-b-0">
                        <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm">
                          <span className="truncate font-label text-carbon">{cobro.concepto}</span>
                          <Badge variant="default">{cobro.tipo}</Badge>
                          <span className="text-carbon">{formatUSD(cobro.monto)}</span>
                          <span className="text-graphite">{formatFecha(cobro.fecha_vencimiento)}</span>
                          <CobroBadge estado={cobro.estado} />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleOpenCobroHistory(cobro)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
                              aria-label={isExpanded ? "Ocultar historial" : "Ver historial"}
                              title={isExpanded ? "Ocultar historial" : "Ver historial"}
                            >
                              <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className={["h-4 w-4 transition-transform duration-fast ease-fast", isExpanded ? "rotate-180" : "rotate-0"].join(" ")}>
                                <path
                                  d="M4.5 6.75L9 11.25L13.5 6.75"
                                  stroke="currentColor"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            {cobro.tipo === "hito" ? (
                              <button
                                type="button"
                                onClick={() => handleEditCobro(cobro)}
                                className="rounded-pill px-3 py-1.5 text-xs font-label text-signal transition-colors duration-fast ease-fast hover:bg-signal-light"
                              >
                                Editar
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="border-t border-line-soft bg-paper/40 px-4 py-3">
                            <div className="space-y-3">
                              {historial.map((item) => {
                                const montoAnterior = item.monto_anterior != null ? formatUSD(item.monto_anterior) : "Sin monto previo";
                                const montoNuevo = item.monto_nuevo != null ? formatUSD(item.monto_nuevo) : "Sin monto nuevo";
                                const fechaAnterior = item.fecha_anterior ? formatFecha(item.fecha_anterior) : "Sin fecha previa";
                                const fechaNueva = item.fecha_nueva ? formatFecha(item.fecha_nueva) : "Sin fecha nueva";

                                return (
                                  <div
                                    key={item.id}
                                    className="rounded-card border border-line-soft bg-white px-4 py-3 text-sm text-carbon"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-label">Monto:</span>
                                      <span>{montoAnterior}</span>
                                      <span className="text-graphite">→</span>
                                      <span>{montoNuevo}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className="font-label">Fecha:</span>
                                      <span>{fechaAnterior}</span>
                                      <span className="text-graphite">→</span>
                                      <span>{fechaNueva}</span>
                                    </div>
                                    {item.nota ? <p className="mt-2 text-sm text-graphite">{item.nota}</p> : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-graphite">
                                      <span>{item.modificado_por_nombre ?? "Sistema"}</span>
                                      <span>·</span>
                                      <span>{formatDateTime(item.created_at)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text="Sin cobros registrados." />
          )}
        </Card>
      ) : null}

      {activeTab === "financiero" ? (
        <div className="space-y-5">
          {tabLoading === "financiero" ? <p className="text-sm text-graphite">Cargando información financiera...</p> : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricaCard
              label="Ingreso Mensual"
              value={formatUSD(rentabilidad?.ingreso_mensual_recurrente ?? 0)}
              icono={<DashboardIcon />}
              colorIcono="signal"
            />
            <MetricaCard
              label="Costo Mensual"
              value={formatUSD(rentabilidad?.costo_mensual ?? 0)}
              icono={<FinanzasIcon />}
              colorIcono="danger"
            />
            <MetricaCard
              label="Margen Mensual"
              value={formatUSD(rentabilidad?.margen_mensual ?? 0)}
              icono={<DashboardIcon />}
              colorIcono="success"
            />
            <MetricaCard
              label="Margen %"
              value={rentabilidad?.margen_pct == null ? "—" : `${rentabilidad.margen_pct.toFixed(1)}%`}
              icono={<DashboardIcon />}
              colorIcono={rentabilidad?.margen_pct == null ? "graphite" : "warning"}
            />
          </div>

          {costosCargados ? <ClienteRentabilidadChart data={rentabilidadHistorico} /> : null}

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-title text-carbon">Costos de este cliente</h3>
                <p className="text-sm text-graphite">
                  Egresos vinculados al cliente para seguir impacto real en Finanzas.
                </p>
              </div>

              <Button onClick={handleOpenCostoModal}>+ Agregar costo</Button>
            </div>

            {costosCargados ? (
              <div className="overflow-hidden rounded-card border border-line-soft">
                <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] gap-3 border-b border-line-soft bg-paper px-4 py-3 text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  <span>Concepto</span>
                  <span>Categoría</span>
                  <span>Monto</span>
                  <span>Recurrente</span>
                  <span>Estado</span>
                </div>
                <div className="divide-y divide-line-soft bg-white">
                  {egresosCliente.map((egreso) => (
                    <div
                      key={egreso.id}
                      className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm"
                    >
                      <span className="truncate font-label text-carbon">{egreso.concepto}</span>
                      <span className="text-graphite">{egresoCategoriaLabels[egreso.categoria]}</span>
                      <span className="text-carbon">{formatUSD(egreso.monto)}</span>
                      <span className="text-graphite">{egreso.recurrente ? "Sí" : "No"}</span>
                      <Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="Todavía no hay costos cargados para este cliente." />
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "suscripcion" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "suscripcion" ? (
            <p className="text-sm text-graphite">Cargando suscripción...</p>
          ) : suscripcion ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Producto / plan</p>
                  <p className="text-sm font-label text-carbon">
                    {suscripcionProducto?.nombre ?? (suscripcion.producto_id ? "Producto SaaS" : "Sin producto")}
                    {suscripcion.producto_id ? ` · ${suscripcionPlan?.nombre ?? "Personalizado"}` : ""}
                  </p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Tipo</p>
                  <p className="text-sm font-label text-carbon">{suscripcion.tipo}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Monto mensual</p>
                  <p className="text-sm font-label text-carbon">{formatUSD(suscripcion.monto_mensual)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Ciclo</p>
                  <p className="text-sm font-label text-carbon">{suscripcion.ciclo}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Estado</p>
                  <div>
                    <SuscripcionBadge estado={suscripcion.estado} />
                  </div>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Fecha de inicio</p>
                  <p className="text-sm font-label text-carbon">
                    {suscripcion.fecha_inicio ? formatFecha(suscripcion.fecha_inicio) : "Sin fecha"}
                  </p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Próxima cobro</p>
                  <p className="text-sm font-label text-carbon">
                    {suscripcion.proxima_cobro ? formatFecha(suscripcion.proxima_cobro) : "Sin fecha"}
                  </p>
                </Card>
              </div>

              {suscripcion.estado === "pendiente" ? (
                <Button
                  className="w-full"
                  loading={activating}
                  onClick={() => {
                    void handleActivateSubscription();
                  }}
                >
                  Activar suscripción
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-base font-title text-carbon">Asignar SaaS</h3>
                <p className="text-sm text-graphite">
                  Elegí producto, plan o monto personalizado para crear la suscripción del cliente.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-label text-carbon">Producto</label>
                  <select
                    value={productoSeleccionadoId}
                    onChange={(event) => {
                      setProductoSeleccionadoId(event.target.value);
                      setPlanSeleccionadoId("");
                      setMontoDraft("");
                      setMontoEditable(false);
                    }}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  >
                    <option value="">{loadingProductos ? "Cargando productos..." : "Seleccionar producto"}</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-label text-carbon">Plan</label>
                  <select
                    value={planSeleccionadoId || "__custom__"}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue === "__custom__") {
                        setPlanSeleccionadoId("");
                        setMontoEditable(true);
                        return;
                      }

                      const selectedPlan = planes.find((plan) => plan.id === nextValue) ?? null;
                      setPlanSeleccionadoId(nextValue);
                      setMontoDraft(selectedPlan ? String(selectedPlan.precio_mensual) : "");
                      setMontoEditable(false);
                    }}
                    disabled={!productoSeleccionadoId || loadingPlanes}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:bg-paper"
                  >
                    {loadingPlanes ? <option value="">Cargando planes...</option> : null}
                    {planes.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} · {formatUSD(plan.precio_mensual)}
                      </option>
                    ))}
                    <option value="__custom__">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <Input
                  label="Monto mensual"
                  type="number"
                  value={montoDraft}
                  onChange={(event) => setMontoDraft(event.target.value)}
                  readOnly={!montoEditable && Boolean(formSelectedPlan)}
                  hint={formSelectedPlan && !montoEditable ? "Podés desbloquear el monto manualmente si querés ajustarlo." : undefined}
                />

                {formSelectedPlan && !montoEditable ? (
                  <Button variant="ghost" size="sm" onClick={() => setMontoEditable(true)} className="w-full md:w-auto">
                    Editar monto
                  </Button>
                ) : null}
              </div>

              <Card padding="md" className="space-y-2 border border-line-soft bg-paper">
                <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Resumen</p>
                <p className="text-sm text-carbon">
                  {formSelectedProducto ? formSelectedProducto.nombre : "Sin producto"}{" "}
                  {formSelectedPlan ? `· ${formSelectedPlan.nombre}` : "· Personalizado"}
                </p>
                <p className="text-xs text-graphite">
                  La suscripción se creará en estado pendiente y el cobro mensual automático seguirá funcionando.
                </p>
              </Card>

              <div className="flex justify-end">
                <Button
                  className="w-full md:w-auto"
                  loading={creatingSuscripcion}
                  onClick={() => {
                    void handleCreateSaaSSubscription();
                  }}
                  disabled={!productoSeleccionadoId || !montoDraft.trim() || loadingPlanes}
                >
                  Crear suscripción
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {activeTab === "historial" ? (
        <Card padding="lg" className="space-y-4">
          <div className="space-y-2">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={`${cliente.id}-${note}`}
                  className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-carbon"
                >
                  {note}
                </div>
              ))
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-graphite">
                Sin historial todavía
              </div>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              value={notaDraft}
              onChange={(event) => setNotaDraft(event.target.value)}
              placeholder="Agregar nota"
              className="min-h-[100px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  const trimmed = notaDraft.trim();

                  if (!trimmed) {
                    return;
                  }

                  void onUpdate({
                    notas: `[${formatTimestamp()}] ${trimmed}${cliente.notas ? `\n${cliente.notas}` : ""}`
                  });
                  setNotaDraft("");
                }}
              >
                Agregar nota
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Modal
        isOpen={contratoConfirmOpen}
        onClose={() => setContratoConfirmOpen(false)}
        title="Confirmar redefinición"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-card border border-warning bg-warning-light px-4 py-3 text-sm text-carbon">
            <p className="font-title text-carbon">Este cambio impacta solo lo pendiente.</p>
            <p className="mt-2">
              Este cliente tiene <strong>{formatUSD(contratoImpacto?.montoCobradas ?? 0)}</strong> ya cobrados en{" "}
              <strong>{contratoImpacto?.cobradas ?? 0}</strong> cuotas. Eso queda intacto.
            </p>
            <p className="mt-2">
              Se van a eliminar <strong>{contratoImpacto?.pendientes ?? 0}</strong> cuotas pendientes por{" "}
              <strong>{formatUSD(contratoImpacto?.montoPendiente ?? 0)}</strong> y se va a generar un nuevo plan de{" "}
              <strong>{contratoImpacto?.nuevasCuotas ?? 0}</strong> cuotas por{" "}
              <strong>{formatUSD(contratoImpacto?.nuevoValorTotal ?? 0)}</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-label text-carbon" htmlFor="contrato-motivo-redefinicion">
              Motivo de la renegociación
            </label>
            <textarea
              id="contrato-motivo-redefinicion"
              value={contratoForm.motivo_redefinicion}
              onChange={(event) =>
                setContratoForm((current) => ({ ...current, motivo_redefinicion: event.target.value }))
              }
              placeholder="Cliente pidió ajustar plazos, monto o mantenimiento..."
              className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setContratoConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={savingContrato}
              onClick={() => {
                void persistContrato({
                  valor_total: Number(contratoForm.valor_total),
                  cantidad_cuotas: Number(contratoForm.cantidad_cuotas),
                  dia_pago: Number(contratoForm.dia_pago),
                  fecha_primera_cuota: contratoForm.fecha_primera_cuota.trim(),
                  valor_mantenimiento_mensual:
                    contratoForm.valor_mantenimiento_mensual.trim() &&
                    Number(contratoForm.valor_mantenimiento_mensual) > 0
                      ? Number(contratoForm.valor_mantenimiento_mensual)
                      : null,
                  dia_facturacion_mantenimiento:
                    contratoForm.valor_mantenimiento_mensual.trim() &&
                    Number(contratoForm.valor_mantenimiento_mensual) > 0
                      ? Number(contratoForm.dia_facturacion_mantenimiento)
                      : null,
                  motivo_redefinicion: contratoForm.motivo_redefinicion.trim() || null
                });
              }}
            >
              Confirmar redefinición
            </Button>
          </div>
        </div>
      </Modal>

      <CobroModal
        isOpen={cobroModalOpen}
        onClose={() => {
          setCobroModalOpen(false);
          setSelectedCobro(null);
        }}
        onSave={handleSaveCobro}
        cobro={selectedCobro}
        clientes={[{ id: cliente.id, empresa: cliente.empresa, pais: cliente.pais ?? null, estado: cliente.estado }]}
        proyectos={proyectos.map((proyecto) => ({
          id: proyecto.id,
          nombre: proyecto.nombre,
          estado: proyecto.estado,
          cliente_id: proyecto.cliente_id,
          clienteNombre: cliente.empresa
        }))}
        cotizaciones={[]}
        suscripciones={suscripcion ? [suscripcion] : []}
        cajas={[]}
      />

      <EgresoModal
        isOpen={egresoModalOpen}
        onClose={closeCostoModal}
        onSave={handleSaveCosto}
        defaults={selectedEgresoDefaults ?? undefined}
        proyectos={proyectos.map((proyecto) => ({
          id: proyecto.id,
          nombre: proyecto.nombre,
          estado: proyecto.estado,
          cliente_id: proyecto.cliente_id,
          clienteNombre: cliente.empresa
        }))}
        cajas={[]}
        saving={creatingCosto}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </div>
  );
}
