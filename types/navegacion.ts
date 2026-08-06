export const navegacionSecciones = {
  marca: "Marca",
  ai_hub: "AI Hub",
  comercial: "Comercial",
  entrega: "Entrega",
  control: "Control"
} as const;

export type NavegacionSeccionKey = keyof typeof navegacionSecciones;

export type PreferenciaNavegacion = {
  id: string;
  usuario_id: string;
  secciones_ocultas: NavegacionSeccionKey[];
  modo_foco_activo: boolean;
  created_at: string;
  updated_at: string;
};

export type PreferenciaNavegacionResponse = {
  data: PreferenciaNavegacion;
  secciones_disponibles: NavegacionSeccionKey[];
};
