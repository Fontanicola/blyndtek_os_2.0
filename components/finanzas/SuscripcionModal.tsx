"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { Cliente } from "@/types/clientes";
import type { Proyecto } from "@/types/proyectos";
import type { Cotizacion } from "@/types/cotizaciones";
import type { CreateSuscripcionInput, EstadoSuscripcion, Suscripcion } from "@/types/suscripciones";

type SuscripcionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateSuscripcionInput) => Promise<void> | void;
  suscripcion?: Suscripcion | null;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado">>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
};

export function SuscripcionModal({
  isOpen,
  onClose,
  onSave,
  suscripcion,
  clientes,
  proyectos,
  cotizaciones
}: SuscripcionModalProps) {
  const [clienteId, setClienteId] = useState(suscripcion?.cliente_id ?? "");
  const [proyectoId, setProyectoId] = useState(suscripcion?.proyecto_id ?? "");
  const [cotizacionId, setCotizacionId] = useState(suscripcion?.cotizacion_id ?? "");
  const [tipo, setTipo] = useState<CreateSuscripcionInput["tipo"]>(suscripcion?.tipo ?? "mantenimiento");
  const [montoMensual, setMontoMensual] = useState(String(suscripcion?.monto_mensual ?? ""));
  const [ciclo, setCiclo] = useState<CreateSuscripcionInput["ciclo"]>(suscripcion?.ciclo ?? "mensual");
  const [estado, setEstado] = useState<EstadoSuscripcion>(suscripcion?.estado ?? "pendiente");
  const [fechaInicio, setFechaInicio] = useState(suscripcion?.fecha_inicio ?? "");
  const [proximaCobro, setProximaCobro] = useState(suscripcion?.proxima_cobro ?? "");

  useEffect(() => {
    setClienteId(suscripcion?.cliente_id ?? "");
    setProyectoId(suscripcion?.proyecto_id ?? "");
    setCotizacionId(suscripcion?.cotizacion_id ?? "");
    setTipo(suscripcion?.tipo ?? "mantenimiento");
    setMontoMensual(String(suscripcion?.monto_mensual ?? ""));
    setCiclo(suscripcion?.ciclo ?? "mensual");
    setEstado(suscripcion?.estado ?? "pendiente");
    setFechaInicio(suscripcion?.fecha_inicio ?? "");
    setProximaCobro(suscripcion?.proxima_cobro ?? "");
  }, [isOpen, suscripcion]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={suscripcion ? "Editar suscripción" : "Nueva suscripción"} size="md">
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
        <EntitySelect
          label="Cotización"
          value={cotizacionId || null}
          required
          placeholder="Seleccionar cotización"
          options={cotizaciones.map((cotizacion) => ({
            id: cotizacion.id,
            label: cotizacion.empresa,
            sublabel: cotizacion.precio_total != null ? `USD ${cotizacion.precio_total}` : undefined
          }))}
          onChange={(id) => setCotizacionId(id ?? "")}
        />
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Tipo</label>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as CreateSuscripcionInput["tipo"])}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="mantenimiento">Mantenimiento</option>
              <option value="brick">Brick</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Ciclo</label>
            <select
              value={ciclo}
              onChange={(event) => setCiclo(event.target.value as CreateSuscripcionInput["ciclo"])}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Monto mensual" type="number" value={montoMensual} onChange={(event) => setMontoMensual(event.target.value)} />
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Estado</label>
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value as EstadoSuscripcion)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="pendiente">Pendiente</option>
              <option value="activa">Activa</option>
              <option value="pausada">Pausada</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Fecha inicio" type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />
          <Input label="Próximo cobro" type="date" value={proximaCobro} onChange={(event) => setProximaCobro(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!clienteId.trim() || !cotizacionId.trim() || !montoMensual.trim()) {
                return;
              }

              void onSave({
                cliente_id: clienteId.trim(),
                proyecto_id: proyectoId.trim() || null,
                cotizacion_id: cotizacionId.trim(),
                tipo,
                monto_mensual: Number(montoMensual),
                ciclo,
                estado,
                fecha_inicio: fechaInicio || null,
                proxima_cobro: proximaCobro || null
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
