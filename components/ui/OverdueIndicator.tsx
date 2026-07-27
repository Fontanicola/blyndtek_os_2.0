import { AlertTriangleIcon } from "./icons";

export function OverdueIndicator({ label = "Este registro requiere atención porque tiene atraso." }: { label?: string }) {
  return <span title={label} aria-label={label} className="inline-flex text-danger"><AlertTriangleIcon size={15} /></span>;
}
