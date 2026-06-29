import { TareasClient } from "@/components/tareas";
import { getCurrentUser } from "@/lib/auth";
import { getTaskSupportData } from "@/lib/task-support";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const [usuario, supportData] = await Promise.all([getCurrentUser(), getTaskSupportData()]);

  return (
    <TareasClient usuario={usuario} proyectos={supportData.proyectos} usuarios={supportData.usuarios} />
  );
}
