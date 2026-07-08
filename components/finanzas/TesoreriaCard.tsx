"use client";

import { Badge, Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";

type TesoreriaItem = {
  cuenta_medio: string;
  label: string;
  monto: number;
  cantidad: number;
};

type TesoreriaCardProps = {
  items: TesoreriaItem[];
};

export function TesoreriaCard({ items }: TesoreriaCardProps) {
  const total = items.reduce((sum, item) => sum + item.monto, 0);

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Tesorería</h3>
          <p className="text-sm text-graphite">Dónde está la plata que ya entró.</p>
        </div>
        <Badge variant="signal">{formatUSD(total)}</Badge>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.cuenta_medio || item.label} className="flex items-center justify-between gap-4 rounded-component bg-paper px-4 py-3">
              <div>
                <p className="text-sm font-label text-carbon">{item.label}</p>
                <p className="text-xs text-graphite">{item.cantidad} cobro{item.cantidad === 1 ? "" : "s"}</p>
              </div>
              <p className="text-sm font-label text-carbon">{formatUSD(item.monto)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-graphite">Todavía no hay cobros cobrados para desglosar.</p>
      )}
    </Card>
  );
}
