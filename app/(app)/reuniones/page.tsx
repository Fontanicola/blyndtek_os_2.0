import { ReunionesClient } from "@/components/reuniones";
import { getCurrentUser } from "@/lib/auth";
import { getTaskSupportData } from "@/lib/task-support";

export const dynamic = "force-dynamic";

export default async function ReunionesPage() {
  const supportData = await getTaskSupportData();
  const currentUser = await getCurrentUser();
  return <ReunionesClient usuarios={supportData.usuarios} currentUserId={currentUser?.id} />;
}
