import { redirect } from "next/navigation";
import { PerfilClient } from "@/components/perfil/PerfilClient";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <PerfilClient usuario={usuario} />
    </div>
  );
}
