"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { CreateCobroInput, Cobro } from "@/types/cobros";
import type { Cliente } from "@/types/clientes";
import type { Proyecto } from "@/types/proyectos";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Suscripcion } from "@/types/suscripciones";

type CobroModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateCobroInput) => Promise<void> | void;
  cobro?: Cobro | null;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado">>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  suscripciones: Array<Pick<Suscripcion, "id" | "tipo" | "estado" | "monto_mensual">>;
};

export function CobroModal({
  isOpen,
  onClose,
  onSave,
  cobro,
  clientes,
  proyectos,
  cotizaciones,
  suscripciones
}: CobroModalProps) {
  const [concepto, setConcepto] = useState(cobro?.concepto ?? "");
  const [monto, setMonto] = useState(String(cobro?.monto ?? ""));
  const [fechaEmision, setFechaEmision] = useState(cobro?.fecha_emision ?? new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState(cobro?.fecha_vencimiento ?? new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<CreateCobroInput["tipo"]>(cobro?.tipo ?? "hito");
  const [clienteId, setClienteId] = useState(cobro?.cliente_id ?? "");
  const [proyectoId, setProyectoId] = useState(cobro?.proyecto_id ?? "");
  const [suscripcionId, setSuscripcionId] = useState(cobro?.suscripcion_id ?? "");
  const [cotizacionId, setCotizacionId] = useState(cobro?.cotizacion_id ?? "");

  useEffect(() => {
    setConcepto(cobro?.concepto ?? "");
    setMonto(String(cobro?.monto ?? ""));
    setFechaEmision(cobro?.fecha_emision ?? new Date().toISOString().slice(0, 10));
    setFechaVencimiento(cobro?.fecha_vencimiento ?? new Date().toISOString().slice(0, 10));
    setTipo(cobro?.tipo ?? "hito");
    setClienteId(cobro?.cliente_id ?? "");
    setProyectoId(cobro?.proyecto_id ?? "");
    setSuscripcionId(cobro?.suscripcion_id ?? "");
    setCotizacionId(cobro?.cotizacion_id ?? "");
  }, [cobro, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cobro ? "Editar cobro" : "Nuevo cobro"} size="md">
      <div className="space-y-4">
        <EntitySelect
          label="Cliente"
          value={clienteId || null}
          required
          placeholder="Seleccionar cliente"
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
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Fecha emisión" type="date" value={fechaEmision} onChange={(event) => setFechaEmision(event.target.value)} />
          <Input label="Fecha vencimiento" type="date" value={fechaVencimiento} onChange={(event) => setFechaVencimiento(event.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EntitySelect
            label="Proyecto"
            value={proyectoId || null}
            allowEmpty
            placeholder="Sin proyecto"
            options={proyectos.map((proyecto) => ({
              id: proyecto.id,
              label: proyecto.nombre,
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

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!clienteId.trim() || !concepto.trim() || !monto.trim()) {
                return;
              }

              void onSave({
                cliente_id: clienteId.trim(),
                concepto: concepto.trim(),
                tipo,
                monto: Number(monto),
                fecha_emision: fechaEmision,
                fecha_vencimiento: fechaVencimiento,
                proyecto_id: proyectoId.trim() || null,
                suscripcion_id: suscripcionId.trim() || null,
                cotizacion_id: cotizacionId.trim() || null,
                estado: cobro?.estado ?? "pendiente"
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
