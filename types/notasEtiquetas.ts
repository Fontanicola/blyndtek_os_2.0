export type NotaEtiquetaColor = "default" | "amarillo" | "rosa" | "celeste" | "verde" | "violeta";

export type NotaEtiqueta = {
  id: string;
  nombre: string;
  color: NotaEtiquetaColor;
  created_at: string;
};
