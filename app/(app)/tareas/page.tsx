import { TareasClient } from "@/components/tareas";
import { getCurrentUser } from "@/lib/auth";
import { getTaskSupportData } from "@/lib/task-support";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const [usuario, supportData] = await Promise.all([getCurrentUser(), getTaskSupportData()]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TareasClient usuario={usuario} proyectos={supportData.proyectos} usuarios={supportData.usuarios} />
    </div>
  );
}
