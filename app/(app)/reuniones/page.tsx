import { ReunionesClient } from "@/components/reuniones";
import { getTaskSupportData } from "@/lib/task-support";

export const dynamic = "force-dynamic";

export default async function ReunionesPage() {
  const supportData = await getTaskSupportData();
  return <ReunionesClient usuarios={supportData.usuarios} />;
}
