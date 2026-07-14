export type SesionTiempo = {
  id: string;
  fase_id: string;
  usuario_id: string | null;
  inicio: string;
  fin: string | null;
  duracion_segundos: number | null;
  nota: string | null;
  es_ia?: boolean;
  created_at: string;
};

export type SesionTiempoUsuarioResumen = {
  usuario_id: string | null;
  nombre: string;
  segundos: number;
};

export type SesionTiempoFaseResumen = {
  fase_id: string;
  nombre: string;
  segundos: number;
  por_usuario: SesionTiempoUsuarioResumen[];
};

export type SesionTiempoFaseDetalle = SesionTiempo & {
  usuario_nombre: string;
  fase_nombre: string;
  proyecto_nombre: string;
  segundos: number;
};

export type SesionTiempoFaseResponse = {
  sesiones: SesionTiempoFaseDetalle[];
  resumen: {
    total_segundos: number;
    por_usuario: SesionTiempoUsuarioResumen[];
  };
};

export type ProyectoTiempoResponse = {
  total_segundos: number;
  por_fase: SesionTiempoFaseResumen[];
  por_usuario: SesionTiempoUsuarioResumen[];
};
