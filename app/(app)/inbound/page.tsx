import { Suspense } from "react";
import InboundClient from "@/components/inbound/InboundClient";

export default function InboundPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando leads inbound...</div>}>
      <InboundClient />
    </Suspense>
  );
}
