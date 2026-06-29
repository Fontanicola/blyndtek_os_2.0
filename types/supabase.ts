export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cotizaciones: {
        Row: {
          id: string;
          lead_id: string | null;
          cliente_id: string | null;
          empresa: string;
          precio_total: number | null;
          mantenimiento_mensual: number | null;
          plazo_semanas: number | null;
          hitos: Json;
          modulos: Json;
          contexto_chat: Json;
          adjuntos: Json;
          entendimiento: string | null;
          beneficios: Json;
          por_que_nosotros: Json;
          justificacion_precio: string | null;
          mantenimiento_detalle: Json | null;
          supuestos: Json;
          condiciones_comerciales: Json;
          datos_propuesta: Json | null;
          resumen_ejecutivo: string | null;
          estado: "borrador" | "enviada" | "aceptada" | "rechazada";
          pdf_propuesta_url: string | null;
          pdf_roadmap_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          empresa: string;
          precio_total?: number | null;
          mantenimiento_mensual?: number | null;
          plazo_semanas?: number | null;
          hitos?: Json;
          modulos?: Json;
          contexto_chat?: Json;
          adjuntos?: Json;
          entendimiento?: string | null;
          beneficios?: Json;
          por_que_nosotros?: Json;
          justificacion_precio?: string | null;
          mantenimiento_detalle?: Json | null;
          supuestos?: Json;
          condiciones_comerciales?: Json;
          datos_propuesta?: Json | null;
          resumen_ejecutivo?: string | null;
          estado?: "borrador" | "enviada" | "aceptada" | "rechazada";
          pdf_propuesta_url?: string | null;
          pdf_roadmap_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          empresa?: string;
          precio_total?: number | null;
          mantenimiento_mensual?: number | null;
          plazo_semanas?: number | null;
          hitos?: Json;
          modulos?: Json;
          contexto_chat?: Json;
          adjuntos?: Json;
          entendimiento?: string | null;
          beneficios?: Json;
          por_que_nosotros?: Json;
          justificacion_precio?: string | null;
          mantenimiento_detalle?: Json | null;
          supuestos?: Json;
          condiciones_comerciales?: Json;
          datos_propuesta?: Json | null;
          resumen_ejecutivo?: string | null;
          estado?: "borrador" | "enviada" | "aceptada" | "rechazada";
          pdf_propuesta_url?: string | null;
          pdf_roadmap_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotizaciones_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      clientes: {
        Row: {
          id: string;
          lead_id: string | null;
          empresa: string;
          pais: string | null;
          contacto_nombre: string | null;
          contacto_email: string | null;
          contacto_whatsapp: string | null;
          datos_facturacion: Json | null;
          estado: "activo" | "inactivo";
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          empresa: string;
          pais?: string | null;
          contacto_nombre?: string | null;
          contacto_email?: string | null;
          contacto_whatsapp?: string | null;
          datos_facturacion?: Json | null;
          estado?: "activo" | "inactivo";
          notas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          empresa?: string;
          pais?: string | null;
          contacto_nombre?: string | null;
          contacto_email?: string | null;
          contacto_whatsapp?: string | null;
          datos_facturacion?: Json | null;
          estado?: "activo" | "inactivo";
          notas?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      cobros: {
        Row: {
          id: string;
          cliente_id: string;
          proyecto_id: string | null;
          suscripcion_id: string | null;
          cotizacion_id: string | null;
          concepto: string;
          tipo: "one_pay" | "hito" | "mantenimiento" | "brick";
          monto: number;
          fecha_emision: string;
          fecha_vencimiento: string;
          fecha_cobro: string | null;
          estado: "pendiente" | "facturado" | "cobrado" | "vencido";
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          proyecto_id?: string | null;
          suscripcion_id?: string | null;
          cotizacion_id?: string | null;
          concepto: string;
          tipo: "one_pay" | "hito" | "mantenimiento" | "brick";
          monto: number;
          fecha_emision: string;
          fecha_vencimiento: string;
          fecha_cobro?: string | null;
          estado?: "pendiente" | "facturado" | "cobrado" | "vencido";
          created_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          proyecto_id?: string | null;
          suscripcion_id?: string | null;
          cotizacion_id?: string | null;
          concepto?: string;
          tipo?: "one_pay" | "hito" | "mantenimiento" | "brick";
          monto?: number;
          fecha_emision?: string;
          fecha_vencimiento?: string;
          fecha_cobro?: string | null;
          estado?: "pendiente" | "facturado" | "cobrado" | "vencido";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cobros_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobros_cotizacion_id_fkey";
            columns: ["cotizacion_id"];
            isOneToOne: false;
            referencedRelation: "cotizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobros_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobros_suscripcion_id_fkey";
            columns: ["suscripcion_id"];
            isOneToOne: false;
            referencedRelation: "suscripciones";
            referencedColumns: ["id"];
          }
        ];
      };
      features: {
        Row: {
          id: string;
          proyecto_id: string;
          nombre: string;
          descripcion: string;
          fase: string;
          estado: "pendiente" | "en_curso" | "lista";
          responsable_id: string;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          nombre: string;
          descripcion: string;
          fase: string;
          estado?: "pendiente" | "en_curso" | "lista";
          responsable_id: string;
          orden: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          nombre?: string;
          descripcion?: string;
          fase?: string;
          estado?: "pendiente" | "en_curso" | "lista";
          responsable_id?: string;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "features_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "features_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      config_finanzas: {
        Row: {
          id: string;
          caja_inicial: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          caja_inicial: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          caja_inicial?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      cuentas_servicios: {
        Row: {
          id: string;
          proyecto_id: string;
          servicio: string;
          para_que: string | null;
          cuenta_email: string | null;
          notas_acceso: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          servicio: string;
          para_que?: string | null;
          cuenta_email?: string | null;
          notas_acceso?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          servicio?: string;
          para_que?: string | null;
          cuenta_email?: string | null;
          notas_acceso?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cuentas_servicios_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          }
        ];
      };
      egresos: {
        Row: {
          id: string;
          concepto: string;
          categoria: "sueldos" | "pauta" | "fijos" | "dev" | "otro";
          monto: number;
          fecha: string;
          recurrente: boolean;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          concepto: string;
          categoria: "sueldos" | "pauta" | "fijos" | "dev" | "otro";
          monto: number;
          fecha: string;
          recurrente?: boolean;
          notas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          concepto?: string;
          categoria?: "sueldos" | "pauta" | "fijos" | "dev" | "otro";
          monto?: number;
          fecha?: string;
          recurrente?: boolean;
          notas?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          id: string;
          titulo: string;
          fecha_inicio: string;
          fecha_fin: string;
          tipo: "tarea" | "seguimiento" | "vencimiento" | "reunion";
          usuario_id: string;
          referencia_tipo: "tarea" | "lead" | "cobro";
          referencia_id: string;
          google_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          fecha_inicio: string;
          fecha_fin: string;
          tipo: "tarea" | "seguimiento" | "vencimiento" | "reunion";
          usuario_id: string;
          referencia_tipo?: "tarea" | "lead" | "cobro";
          referencia_id?: string;
          google_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          tipo?: "tarea" | "seguimiento" | "vencimiento" | "reunion";
          usuario_id?: string;
          referencia_tipo?: "tarea" | "lead" | "cobro";
          referencia_id?: string;
          google_event_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          canal: "outbound" | "inbound";
          empresa: string;
          rubro: string | null;
          ubicacion: string | null;
          contacto_1_nombre: string | null;
          contacto_1_tel: string | null;
          contacto_2_nombre: string | null;
          contacto_2_tel: string | null;
          web: string | null;
          etapa:
            | "por_contactar"
            | "contactado"
            | "seguimiento"
            | "calificado"
            | "cotizacion"
            | "descartado";
          valor_estimado: number | null;
          responsable_id: string | null;
          llamada_fecha: string | null;
          llamada_hecho: boolean;
          seg1_fecha: string | null;
          seg1_hecho: boolean;
          seg2_fecha: string | null;
          seg2_hecho: boolean;
          referido_por: string | null;
          relacion: string | null;
          nivel_confianza: "alto" | "medio" | "bajo" | null;
          contexto: string | null;
          presupuesto_estimado: number | null;
          motivo_descarte: string | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canal: "outbound" | "inbound";
          empresa: string;
          rubro?: string | null;
          ubicacion?: string | null;
          contacto_1_nombre?: string | null;
          contacto_1_tel?: string | null;
          contacto_2_nombre?: string | null;
          contacto_2_tel?: string | null;
          web?: string | null;
          etapa:
            | "por_contactar"
            | "contactado"
            | "seguimiento"
            | "calificado"
            | "cotizacion"
            | "descartado";
          valor_estimado?: number | null;
          responsable_id?: string | null;
          llamada_fecha?: string | null;
          llamada_hecho?: boolean;
          seg1_fecha?: string | null;
          seg1_hecho?: boolean;
          seg2_fecha?: string | null;
          seg2_hecho?: boolean;
          referido_por?: string | null;
          relacion?: string | null;
          nivel_confianza?: "alto" | "medio" | "bajo" | null;
          contexto?: string | null;
          presupuesto_estimado?: number | null;
          motivo_descarte?: string | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          canal?: "outbound" | "inbound";
          empresa?: string;
          rubro?: string | null;
          ubicacion?: string | null;
          contacto_1_nombre?: string | null;
          contacto_1_tel?: string | null;
          contacto_2_nombre?: string | null;
          contacto_2_tel?: string | null;
          web?: string | null;
          etapa?:
            | "por_contactar"
            | "contactado"
            | "seguimiento"
            | "calificado"
            | "cotizacion"
            | "descartado";
          valor_estimado?: number | null;
          responsable_id?: string | null;
          llamada_fecha?: string | null;
          llamada_hecho?: boolean;
          seg1_fecha?: string | null;
          seg1_hecho?: boolean;
          seg2_fecha?: string | null;
          seg2_hecho?: boolean;
          referido_por?: string | null;
          relacion?: string | null;
          nivel_confianza?: "alto" | "medio" | "bajo" | null;
          contexto?: string | null;
          presupuesto_estimado?: number | null;
          motivo_descarte?: string | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      proyectos: {
        Row: {
          id: string;
          cotizacion_id: string;
          cliente_id: string;
          nombre: string;
          estado:
            | "por_empezar"
            | "en_desarrollo"
            | "implementacion"
            | "entregado"
            | "soporte"
            | "pausado";
          responsable_id: string | null;
          devs_asignados: string[];
          fecha_inicio: string | null;
          entrega_comprometida: string | null;
          entrega_real: string | null;
          avance_pct: number;
          valor_total: number | null;
          notas_arquitectura: string | null;
          roadmap_token: string;
          roadmap_publico_activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          cotizacion_id: string;
          cliente_id: string;
          nombre: string;
          estado?:
            | "por_empezar"
            | "en_desarrollo"
            | "implementacion"
            | "entregado"
            | "soporte"
            | "pausado";
          responsable_id?: string | null;
          devs_asignados?: string[];
          fecha_inicio?: string | null;
          entrega_comprometida?: string | null;
          entrega_real?: string | null;
          avance_pct?: number;
          valor_total?: number | null;
          notas_arquitectura?: string | null;
          roadmap_token: string;
          roadmap_publico_activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          cotizacion_id?: string;
          cliente_id?: string;
          nombre?: string;
          estado?:
            | "por_empezar"
            | "en_desarrollo"
            | "implementacion"
            | "entregado"
            | "soporte"
            | "pausado";
          responsable_id?: string | null;
          devs_asignados?: string[];
          fecha_inicio?: string | null;
          entrega_comprometida?: string | null;
          entrega_real?: string | null;
          avance_pct?: number;
          valor_total?: number | null;
          notas_arquitectura?: string | null;
          roadmap_token?: string;
          roadmap_publico_activo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proyectos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyectos_cotizacion_id_fkey";
            columns: ["cotizacion_id"];
            isOneToOne: false;
            referencedRelation: "cotizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyectos_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      suscripciones: {
        Row: {
          id: string;
          cliente_id: string;
          proyecto_id: string | null;
          cotizacion_id: string;
          tipo: "mantenimiento" | "brick";
          monto_mensual: number;
          ciclo: "mensual" | "anual";
          fecha_inicio: string | null;
          proxima_cobro: string | null;
          estado: "pendiente" | "activa" | "pausada" | "baja";
          fecha_baja: string | null;
          motivo_baja: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          proyecto_id?: string | null;
          cotizacion_id: string;
          tipo: "mantenimiento" | "brick";
          monto_mensual: number;
          ciclo: "mensual" | "anual";
          fecha_inicio?: string | null;
          proxima_cobro?: string | null;
          estado?: "pendiente" | "activa" | "pausada" | "baja";
          fecha_baja?: string | null;
          motivo_baja?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          proyecto_id?: string | null;
          cotizacion_id?: string;
          tipo?: "mantenimiento" | "brick";
          monto_mensual?: number;
          ciclo?: "mensual" | "anual";
          fecha_inicio?: string | null;
          proxima_cobro?: string | null;
          estado?: "pendiente" | "activa" | "pausada" | "baja";
          fecha_baja?: string | null;
          motivo_baja?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suscripciones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suscripciones_cotizacion_id_fkey";
            columns: ["cotizacion_id"];
            isOneToOne: false;
            referencedRelation: "cotizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suscripciones_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          }
        ];
      };
      tareas: {
        Row: {
          id: string;
          titulo: string;
          proyecto_id: string | null;
          responsable_id: string;
          prioridad: "alta" | "media" | "baja";
          fecha_limite: string | null;
          estado: "nueva" | "en_proceso" | "terminada";
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          proyecto_id?: string | null;
          responsable_id: string;
          prioridad?: "alta" | "media" | "baja";
          fecha_limite?: string | null;
          estado?: "nueva" | "en_proceso" | "terminada";
          notas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          proyecto_id?: string | null;
          responsable_id?: string;
          prioridad?: "alta" | "media" | "baja";
          fecha_limite?: string | null;
          estado?: "nueva" | "en_proceso" | "terminada";
          notas?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tareas_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      usuarios: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          rol: "admin" | "miembro";
          google_calendar_token: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          rol?: "admin" | "miembro";
          google_calendar_token?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
          rol?: "admin" | "miembro";
          google_calendar_token?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
