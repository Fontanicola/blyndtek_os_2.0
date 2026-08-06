import { redirect } from "next/navigation";
import { SoftwarePage } from "@/components/software/SoftwarePage";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SoftwareRoute() {
  const usuario = await getCurrentUser();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "admin") redirect(getDefaultRouteForRole(usuario.rol));
  return <SoftwarePage />;
}
