type ProyectoLike = {
  nombre: string;
  clienteNombre?: string | null;
};

export function getProyectoDisplayLabel(proyecto: ProyectoLike): string {
  const clienteNombre = proyecto.clienteNombre?.trim();
  const nombre = proyecto.nombre.trim();

  if (!clienteNombre) {
    return nombre;
  }

  return `${clienteNombre} — ${nombre}`;
}
