"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import { getProyectoDisplayLabel } from "@/lib/proyectos/labels";
import { fechaInputAString, hoyLocalString } from "@/lib/utils/fechas";
import { formatMonthLabel } from "@/lib/finanzas";
import type { CategoriaEgreso, CreateEgresoInput, Egreso, EgresoRecurrenteHistorialItem } from "@/types/egresos";
import type { Proyecto } from "@/types/proyectos";
import type { Caja } from "@/types/cajas";

type EgresoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateEgresoInput) => Promise<void> | void;
  egreso?: Egreso | null;
  defaults?: Partial<CreateEgresoInput>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id"> & { clienteNombre?: string | null }>;
  cajas: Caja[];
  saving?: boolean;
  historialPagos?: EgresoRecurrenteHistorialItem[];
  onToggleHistorialPago?: (month: string, pagado: boolean) => Promise<void> | void;
};

const categorias: Array<{ value: CategoriaEgreso; label: string }> = [
  { value: "dominios", label: "Dominios" },
  { value: "hosting_infraestructura", label: "Hosting/Infraestructura" },
  { value: "herramientas_software", label: "Herramientas/Software" },
  { value: "marketing_ads", label: "Marketing/Ads" },
  { value: "impuestos_contable", label: "Impuestos/Contable" },
  { value: "sueldos_honorarios", label: "Sueldos/Honorarios" },
  { value: "comisiones", label: "Comisiones" },
  { value: "otro", label: "Otro" },
  { value: "transferencia", label: "Transferencia" }
];

function getInitialState(egreso: Egreso | null | undefined, defaults: Partial<CreateEgresoInput> | undefined, cajas: Caja[]) {
  const cajaId =
    egreso?.caja_id ??
    defaults?.caja_id ??
    (egreso?.cuenta_medio ? cajas.find((item) => item.slug === egreso.cuenta_medio)?.id ?? "" : "") ??
    (defaults?.cuenta_medio ? cajas.find((item) => item.slug === defaults.cuenta_medio)?.id ?? "" : "");

  return {
    concepto: egreso?.concepto ?? defaults?.concepto ?? "",
    categoria: egreso?.categoria ?? defaults?.categoria ?? "otro",
    monto: String(egreso?.monto ?? defaults?.monto ?? ""),
    fecha: egreso?.fecha ?? defaults?.fecha ?? hoyLocalString(),
    cajaId,
    cuentaMedio: egreso?.cuenta_medio ?? defaults?.cuenta_medio ?? cajas[0]?.slug ?? null,
    pagado: Boolean(egreso?.pagado ?? defaults?.pagado),
    fechaPago: egreso?.fecha_pago ?? defaults?.fecha_pago ?? hoyLocalString(),
    proyectoId: egreso?.proyecto_id ?? defaults?.proyecto_id ?? "",
    recurrente: Boolean(egreso?.recurrente ?? defaults?.recurrente),
    notas: egreso?.notas ?? defaults?.notas ?? ""
  };
}

export function EgresoModal({
  isOpen,
  onClose,
  onSave,
  egreso,
  defaults,
  proyectos,
  cajas,
  saving,
  historialPagos = [],
  onToggleHistorialPago
}: EgresoModalProps) {
  const initialState = getInitialState(egreso, defaults, cajas);
  const [concepto, setConcepto] = useState(initialState.concepto);
  const [categoria, setCategoria] = useState<CategoriaEgreso>(initialState.categoria);
  const [monto, setMonto] = useState(initialState.monto);
  const [fecha, setFecha] = useState(initialState.fecha);
  const [cajaId, setCajaId] = useState(initialState.cajaId);
  const [cuentaMedio, setCuentaMedio] = useState<CreateEgresoInput["cuenta_medio"]>(initialState.cuentaMedio);
  const [pagado, setPagado] = useState(initialState.pagado);
  const [fechaPago, setFechaPago] = useState(initialState.fechaPago);
  const [proyectoId, setProyectoId] = useState(initialState.proyectoId);
  const [recurrente, setRecurrente] = useState(initialState.recurrente);
  const [notas, setNotas] = useState(initialState.notas);

  useEffect(() => {
    const nextState = getInitialState(egreso, defaults, cajas);
    setConcepto(nextState.concepto);
    setCategoria(nextState.categoria);
    setMonto(nextState.monto);
    setFecha(nextState.fecha);
    setCajaId(nextState.cajaId);
    setCuentaMedio(nextState.cuentaMedio);
    setPagado(nextState.pagado);
    setFechaPago(nextState.fechaPago);
    setProyectoId(nextState.proyectoId);
    setRecurrente(nextState.recurrente);
    setNotas(nextState.notas);
  }, [egreso, defaults, cajas, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={egreso ? "Editar egreso" : "Nuevo egreso"} size="md">
      <div className="space-y-4">
        <Input label="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Categoría</label>
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value as CategoriaEgreso)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {categorias.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Monto en pesos" type="number" min="0" step="1" value={monto} onChange={(event) => setMonto(event.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Caja</label>
            <select
              value={cajaId ?? ""}
              onChange={(event) => {
                const nextCajaId = event.target.value || "";
                const selectedCaja = cajas.find((item) => item.id === nextCajaId) ?? null;
                setCajaId(nextCajaId);
                setCuentaMedio(selectedCaja?.slug ?? null);
              }}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="" disabled>
                Seleccionar caja
              </option>
              {cajas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <EntitySelect
            label="Proyecto"
            value={proyectoId || null}
            allowEmpty
            placeholder="Sin proyecto"
            options={proyectos.map((proyecto) => ({
              id: proyecto.id,
              label: getProyectoDisplayLabel({
                nombre: proyecto.nombre,
                clienteNombre: proyecto.clienteNombre
              }),
              sublabel: proyecto.estado.replaceAll("_", " ")
            }))}
            onChange={(id) => setProyectoId(id ?? "")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-carbon">
            <input
              type="checkbox"
              checked={pagado}
              onChange={(event) => setPagado(event.target.checked)}
              className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
            />
            Pagado
          </label>
          {pagado ? (
            <Input label="Fecha de pago" type="date" value={fechaPago} onChange={(event) => setFechaPago(event.target.value)} />
          ) : null}
        </div>
        <Input label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
        <label className="inline-flex items-center gap-2 text-sm text-carbon">
          <input
            type="checkbox"
            checked={recurrente}
            onChange={(event) => setRecurrente(event.target.checked)}
            className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
          />
          Recurrente
        </label>
        <div className="space-y-1">
          <label className="text-sm font-label text-carbon">Notas</label>
          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>
        {egreso?.recurrente_config_id && historialPagos.length > 0 ? (
          <div className="space-y-3 rounded-card border border-line-soft p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-label text-carbon">Historial de pagos</h3>
              <p className="text-sm text-graphite">Marcá o desmarcá cada mes sin afectar el resto de la plantilla recurrente.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {historialPagos.map((item) => (
                <label
                  key={item.month}
                  className="flex items-center justify-between rounded-component border border-line-soft px-3 py-2 text-sm text-carbon"
                >
                  <span>{item.label || formatMonthLabel(new Date(`${item.month}-01T00:00:00`))}</span>
                  <input
                    type="checkbox"
                    checked={item.pagado}
                    onChange={(event) => void onToggleHistorialPago?.(item.month, event.target.checked)}
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={() =>
              void onSave({
                concepto: concepto.trim(),
                categoria,
                monto: Number(monto),
                fecha: fechaInputAString(fecha),
                recurrente,
                caja_id: cajaId || null,
                cuenta_medio: cuentaMedio ?? null,
                pagado,
                fecha_pago: pagado ? fechaInputAString(fechaPago) : null,
                proyecto_id: proyectoId.trim() || null,
                notas: notas.trim() || null
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
