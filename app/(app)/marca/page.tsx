import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { MarcaContentStudio } from "@/components/marca/MarcaContentStudio";

export const dynamic = "force-dynamic";

export default async function MarcaPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin" && usuario.rol !== "marketing") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  return <MarcaContentStudio />;
}
