import { CalendarioClient } from "@/components/calendario";
import { getCurrentUser } from "@/lib/auth";
import { getTaskSupportData } from "@/lib/task-support";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const [usuario, supportData] = await Promise.all([getCurrentUser(), getTaskSupportData()]);

  return <CalendarioClient usuario={usuario} usuarios={supportData.usuarios} />;
}
