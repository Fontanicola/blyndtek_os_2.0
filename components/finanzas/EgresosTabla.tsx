"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { CategoriaEgreso, Egreso } from "@/types/egresos";
import type { CuentaMedio } from "@/types/cobros";

type EgresosTablaProps = {
  egresos: Egreso[];
  onCreate: (input: {
    concepto: string;
    categoria: CategoriaEgreso;
    monto: number;
    fecha: string;
    recurrente: boolean;
    cuenta_medio?: CuentaMedio | null;
    pagado?: boolean;
    fecha_pago?: string | null;
    notas?: string | null;
  }) => Promise<void> | void;
  onEdit?: (egreso: Egreso) => void;
  onDelete?: (egreso: Egreso) => Promise<void> | void;
};

const categorias: Array<{ value: CategoriaEgreso; label: string }> = [
  { value: "dominios", label: "Dominios" },
  { value: "hosting_infraestructura", label: "Hosting/Infraestructura" },
  { value: "herramientas_software", label: "Herramientas/Software" },
  { value: "marketing_ads", label: "Marketing/Ads" },
  { value: "impuestos_contable", label: "Impuestos/Contable" },
  { value: "sueldos_honorarios", label: "Sueldos/Honorarios" },
  { value: "otro", label: "Otro" }
];

const cuentaMedioOptions: Array<{ value: CuentaMedio; label: string }> = [
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "efectivo", label: "Efectivo" },
  { value: "stripe", label: "Stripe" },
  { value: "otro", label: "Otro" }
];

function categoryLabel(value: CategoriaEgreso) {
  return categorias.find((item) => item.value === value)?.label ?? value;
}

export function EgresosTabla({ egresos, onCreate, onEdit, onDelete }: EgresosTablaProps) {
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEgreso>("otro");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [cuentaMedio, setCuentaMedio] = useState<CuentaMedio>("transferencia");
  const [pagado, setPagado] = useState(false);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [recurrente, setRecurrente] = useState(false);
  const [notas, setNotas] = useState("");

  const total = useMemo(() => egresos.reduce((sum, egreso) => sum + egreso.monto, 0), [egresos]);

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4">
        <div>
          <h3 className="text-base font-title text-carbon">Alta rápida</h3>
          <p className="text-sm text-graphite">Cargá un nuevo egreso sin salir de la pestaña.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input label="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
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
          <Input label="Monto" type="number" value={monto} onChange={(event) => setMonto(event.target.value)} />
          <Input label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Cuenta / medio de pago</label>
            <select
              value={cuentaMedio}
              onChange={(event) => setCuentaMedio(event.target.value as CuentaMedio)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {cuentaMedioOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-carbon">
              <input
                type="checkbox"
                checked={pagado}
                onChange={(event) => {
                  setPagado(event.target.checked);
                  if (event.target.checked && !fechaPago) {
                    setFechaPago(new Date().toISOString().slice(0, 10));
                  }
                }}
                className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
              />
              Pagado
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-carbon">
              <input
                type="checkbox"
                checked={recurrente}
                onChange={(event) => setRecurrente(event.target.checked)}
                className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
              />
              Recurrente
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Fecha de pago</label>
            <Input
              type="date"
              value={pagado ? fechaPago : ""}
              onChange={(event) => setFechaPago(event.target.value)}
              disabled={!pagado}
            />
          </div>
          <div className="space-y-1 md:col-span-2 xl:col-span-1">
            <label className="text-sm font-label text-carbon">Notas</label>
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              className="min-h-[42px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              if (!concepto.trim() || !monto) {
                return;
              }

              void onCreate({
                concepto: concepto.trim(),
                categoria,
                monto: Number(monto),
                fecha,
                recurrente,
                cuenta_medio: cuentaMedio,
                pagado,
                fecha_pago: pagado ? fechaPago : null,
                notas: notas.trim() || null
              });

              setConcepto("");
              setMonto("");
              setNotas("");
              setCuentaMedio("transferencia");
              setPagado(false);
              setFechaPago(new Date().toISOString().slice(0, 10));
              setRecurrente(false);
            }}
          >
            Guardar egreso
          </Button>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-soft">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-label uppercase tracking-[0.08em] text-graphite">
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Recurrente</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-white">
              {egresos.map((egreso) => (
                <tr key={egreso.id}>
                  <td className="px-4 py-3 text-sm font-label text-carbon">{egreso.concepto}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{categoryLabel(egreso.categoria)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{egreso.cuenta_medio ?? "Sin medio"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-label text-carbon">{formatUSD(egreso.monto)}</td>
                  <td className="px-4 py-3 text-sm text-graphite">{formatFecha(egreso.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-graphite">{egreso.recurrente ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {onEdit ? (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(egreso)}>
                          Editar
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button variant="danger" size="sm" onClick={() => void onDelete(egreso)}>
                          Eliminar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {egresos.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-graphite" colSpan={8}>
                    No hay egresos cargados todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line-soft px-4 py-3 text-right text-sm text-graphite">
          Total egresos: <span className="font-label text-carbon">{formatUSD(total)}</span>
        </div>
      </Card>
    </div>
  );
}
