import { MarcaContentStudio } from "@/components/marca/MarcaContentStudio";

export const dynamic = "force-dynamic";

export default async function MarcaCalendarioPage() {
  return <MarcaContentStudio initialTab="calendario" />;
}
