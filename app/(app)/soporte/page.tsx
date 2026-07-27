import { redirect } from "next/navigation";
import { SoporteClient } from "@/components/soporte/SoporteClient";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SoportePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["admin", "miembro", "comercial"].includes(user.rol)) redirect(getDefaultRouteForRole(user.rol));
  return <SoporteClient />;
}
