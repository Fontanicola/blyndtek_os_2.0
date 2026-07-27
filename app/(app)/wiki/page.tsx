import { Suspense } from "react";
import { WikiClient } from "@/components/wiki";
import { PageSkeleton } from "@/components/ui";

export default function WikiPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <WikiClient />
    </Suspense>
  );
}
