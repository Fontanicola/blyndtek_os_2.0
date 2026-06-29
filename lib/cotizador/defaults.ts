import type { DatosPropuesta } from "@/types/cotizaciones";

export const DATOS_PROPUESTA_DEFAULT: DatosPropuesta = {
  preparado_para: "",
  preparado_por: "Blyndtek LLC",
  firmantes: [
    { nombre: "Felipe Fontana", rol: "CEO" },
    { nombre: "Gonzalo", rol: "COO" }
  ],
  email_contacto: "blyndtek@gmail.com",
  telefono_contacto: "+54 11 6591-8174",
  instagram: "@blyndtek.inc",
  linkedin: "/company/blyndtek",
  validez_dias: 30,
  titulo_sistema: "",
  subtitulo_sistema: ""
};

export const CONDICIONES_COMERCIALES_DEFAULT = [
  "La propiedad intelectual del desarrollo se transfiere al saldar el proyecto.",
  "La propuesta tiene una validez de 30 días corridos.",
  "Todos los valores están expresados en USD.",
  "El alcance corresponde exclusivamente a lo descripto en la propuesta.",
  "La permanencia mínima del mantenimiento es de 12 meses.",
  "El abono de mantenimiento se ajusta una vez por año."
];

export const SUPUESTOS_DEFAULT = [
  "Se cuenta con acceso a los datos del sistema actual.",
  "Existe disponibilidad de un referente del cliente para validaciones.",
  "Las credenciales y accesos necesarios se entregan en tiempo y forma."
];

export function createDatosPropuestaDefault(preparadoPara: string): DatosPropuesta {
  return {
    ...DATOS_PROPUESTA_DEFAULT,
    preparado_para: preparadoPara,
    firmantes: DATOS_PROPUESTA_DEFAULT.firmantes.map((firmante) => ({ ...firmante }))
  };
}
