import Image from "next/image";

export default function RoadmapNotFound() {
  return (
    <main className="min-h-screen bg-paper px-5 py-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-card border border-line-soft bg-white px-8 py-14 text-center">
        <Image
          src="/Logo_Blyndtek_plataforma.svg"
          alt="Blyndtek"
          width={144}
          height={34}
          className="h-8 w-auto"
          priority
        />
        <h1 className="mt-8 text-2xl font-title text-carbon">Este roadmap no está disponible.</h1>
        <p className="mt-3 max-w-md text-sm text-graphite">
          El enlace puede haber vencido, estar desactivado o no corresponder a un roadmap público
          activo.
        </p>
      </div>
    </main>
  );
}
