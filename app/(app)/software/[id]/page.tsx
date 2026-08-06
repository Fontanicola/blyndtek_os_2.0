import { redirect } from "next/navigation";
import { SoftwareDetailPage } from "@/components/software/SoftwareDetailPage";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SoftwareDetailRoute({ params }: { params: { id: string } }) {
  const usuario = await getCurrentUser();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "admin") redirect(getDefaultRouteForRole(usuario.rol));
  return <SoftwareDetailPage sistemaId={params.id} />;
}
