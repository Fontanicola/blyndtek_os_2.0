import { TimelineEntregaClient } from "@/components/timeline";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente } from "@/types/clientes";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const usuario = await getCurrentUser();
  const supabase = createAdminClient();
  const { data } = await supabase.from("clientes").select("id, empresa").order("empresa", { ascending: true });
  const clientes = (data ?? []) as Array<Pick<Cliente, "id" | "empresa">>;

  return <TimelineEntregaClient usuario={usuario} clientes={clientes} />;
}
