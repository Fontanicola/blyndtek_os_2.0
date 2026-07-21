"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import { normalizeCajaSlug } from "@/lib/cajas";
import { getProyectoDisplayLabel } from "@/lib/proyectos/labels";
import { fechaInputAString, hoyLocalString } from "@/lib/utils/fechas";
import type { Cobro, CreateCobroInput, EstadoCobro } from "@/types/cobros";
import type { Caja } from "@/types/cajas";
import type { Cliente } from "@/types/clientes";
import type { Proyecto } from "@/types/proyectos";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Suscripcion } from "@/types/suscripciones";

type CobroModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CobroModalInput) => Promise<void> | void;
  cobro?: Cobro | null;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id"> & { clienteNombre?: string | null }>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  suscripciones: Array<Pick<Suscripcion, "id" | "tipo" | "estado" | "monto_mensual">>;
  cajas: Caja[];
};

export type CobroModalInput = CreateCobroInput & {
  nota_historial?: string | null;
};

export function CobroModal({
  isOpen,
  onClose,
  onSave,
  cobro,
  clientes,
  proyectos,
  cotizaciones,
  suscripciones,
  cajas
}: CobroModalProps) {
  const resolveInitialCajaId = useCallback(
    (currentCobro?: Cobro | null) => {
      if (currentCobro?.caja_id) {
        return currentCobro.caja_id;
      }

      const legacySlug = normalizeCajaSlug(currentCobro?.cuenta_medio);
      return legacySlug ? cajas.find((item) => item.slug === legacySlug)?.id ?? "" : "";
    },
    [cajas]
  );

  const [concepto, setConcepto] = useState(cobro?.concepto ?? "");
  const [monto, setMonto] = useState(String(cobro?.monto ?? ""));
  const [fechaEmision, setFechaEmision] = useState(cobro?.fecha_emision ?? hoyLocalString());
  const [fechaVencimiento, setFechaVencimiento] = useState(cobro?.fecha_vencimiento ?? hoyLocalString());
  const [tipo, setTipo] = useState<CreateCobroInput["tipo"]>(cobro?.tipo ?? "hito");
  const [estado, setEstado] = useState<EstadoCobro>(cobro?.estado ?? "pendiente");
  const [fechaCobro, setFechaCobro] = useState(cobro?.fecha_cobro ?? hoyLocalString());
  const [selectedCajaId, setSelectedCajaId] = useState(resolveInitialCajaId(cobro));
  const [toleranciaDias, setToleranciaDias] = useState(String(cobro?.tolerancia_dias ?? 0));
  const [clienteId, setClienteId] = useState(cobro?.cliente_id ?? "");
  const [proyectoId, setProyectoId] = useState(cobro?.proyecto_id ?? "");
  const [suscripcionId, setSuscripcionId] = useState(cobro?.suscripcion_id ?? "");
  const [cotizacionId, setCotizacionId] = useState(cobro?.cotizacion_id ?? "");
  const [notaCambio, setNotaCambio] = useState("");

  useEffect(() => {
    setConcepto(cobro?.concepto ?? "");
    setMonto(String(cobro?.monto ?? ""));
    setFechaEmision(cobro?.fecha_emision ?? hoyLocalString());
    setFechaVencimiento(cobro?.fecha_vencimiento ?? hoyLocalString());
    setTipo(cobro?.tipo ?? "hito");
    setEstado(cobro?.estado ?? "pendiente");
    setFechaCobro(cobro?.fecha_cobro ?? hoyLocalString());
    setSelectedCajaId(resolveInitialCajaId(cobro));
    setToleranciaDias(String(cobro?.tolerancia_dias ?? 0));
    setClienteId(cobro?.cliente_id ?? "");
    setProyectoId(cobro?.proyecto_id ?? "");
    setSuscripcionId(cobro?.suscripcion_id ?? "");
    setCotizacionId(cobro?.cotizacion_id ?? "");
    setNotaCambio("");
  }, [cobro, isOpen, resolveInitialCajaId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cobro ? "Editar ingreso" : "Nuevo ingreso"} size="md">
      <div className="space-y-4">
        <EntitySelect
          label="Cliente"
          value={clienteId || null}
          allowEmpty
          placeholder="Sin cliente"
          options={clientes.map((cliente) => ({
            id: cliente.id,
            label: cliente.empresa,
            sublabel: cliente.pais ?? cliente.estado
          }))}
          onChange={(id) => setClienteId(id ?? "")}
        />
        <Input label="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Monto" type="number" value={monto} onChange={(event) => setMonto(event.target.value)} />
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Tipo</label>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as CreateCobroInput["tipo"])}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="one_pay">One pay</option>
              <option value="hito">Hito</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="brick">Brick</option>
              <option value="diagnostico">Diagnóstico</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Caja</label>
            <select
              value={selectedCajaId}
              onChange={(event) => setSelectedCajaId(event.target.value)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="">
                Sin caja
              </option>
              {cajas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Tolerancia (días)"
            type="number"
            value={toleranciaDias}
            onChange={(event) => setToleranciaDias(event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Fecha emisión" type="date" value={fechaEmision} onChange={(event) => setFechaEmision(event.target.value)} />
          <Input label="Fecha vencimiento" type="date" value={fechaVencimiento} onChange={(event) => setFechaVencimiento(event.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Estado</label>
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value as EstadoCobro)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="pendiente">Pendiente</option>
              <option value="facturado">Facturado</option>
              <option value="cobrado">Cobrado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          {estado === "cobrado" ? (
            <Input label="Fecha de cobro" type="date" value={fechaCobro} onChange={(event) => setFechaCobro(event.target.value)} />
          ) : (
            <div />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
          <EntitySelect
            label="Suscripción"
            value={suscripcionId || null}
            allowEmpty
            placeholder="Sin suscripción"
            options={suscripciones.map((suscripcion) => ({
              id: suscripcion.id,
              label: `${suscripcion.tipo} · USD ${suscripcion.monto_mensual}`,
              sublabel: suscripcion.estado
            }))}
            onChange={(id) => setSuscripcionId(id ?? "")}
          />
        </div>
        <EntitySelect
          label="Cotización"
          value={cotizacionId || null}
          allowEmpty
          placeholder="Sin cotización"
          options={cotizaciones.map((cotizacion) => ({
            id: cotizacion.id,
            label: cotizacion.empresa,
            sublabel: cotizacion.precio_total != null ? `USD ${cotizacion.precio_total}` : undefined
          }))}
          onChange={(id) => setCotizacionId(id ?? "")}
        />

        {cobro ? (
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Nota del cambio</label>
            <textarea
              value={notaCambio}
              onChange={(event) => setNotaCambio(event.target.value)}
              placeholder="Motivo del cambio (opcional)"
              className="min-h-[96px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!concepto.trim() || !monto.trim()) {
                return;
              }

              const selectedCaja = cajas.find((item) => item.id === selectedCajaId) ?? null;

              void onSave({
                cliente_id: clienteId.trim() || null,
                concepto: concepto.trim(),
                tipo,
                monto: Number(monto),
                fecha_emision: fechaInputAString(fechaEmision),
                fecha_vencimiento: fechaInputAString(fechaVencimiento),
                proyecto_id: proyectoId.trim() || null,
                suscripcion_id: suscripcionId.trim() || null,
                cotizacion_id: cotizacionId.trim() || null,
                caja_id: selectedCaja?.id ?? null,
                cuenta_medio: selectedCaja?.slug ?? null,
                tolerancia_dias: Number(toleranciaDias || 0),
                estado,
                fecha_cobro: estado === "cobrado" ? fechaInputAString(fechaCobro) : null,
                nota_historial: cobro ? notaCambio.trim() || null : undefined
              });
            }}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
