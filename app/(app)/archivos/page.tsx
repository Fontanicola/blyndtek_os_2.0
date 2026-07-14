import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { ArchivosClient, ArchivosCompartidosClient } from "@/components/archivos";

export const dynamic = "force-dynamic";

export default async function ArchivosPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol === "comercial") {
    return <ArchivosCompartidosClient usuario={usuario} />;
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  return <ArchivosClient />;
}
