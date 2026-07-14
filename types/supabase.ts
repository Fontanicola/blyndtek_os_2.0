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
          estado: "activo" | "pausado" | "inactivo";
          notas: string | null;
          vendedor_id: string | null;
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
          estado?: "activo" | "pausado" | "inactivo";
          notas?: string | null;
          vendedor_id?: string | null;
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
          estado?: "activo" | "pausado" | "inactivo";
          notas?: string | null;
          vendedor_id?: string | null;
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
          cuenta_medio: string | null;
          tolerancia_dias: number;
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
          cuenta_medio?: string | null;
          tolerancia_dias?: number;
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
          cuenta_medio?: string | null;
          tolerancia_dias?: number;
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
      cobros_historial_cambios: {
        Row: {
          id: string;
          cobro_id: string;
          monto_anterior: number | null;
          monto_nuevo: number | null;
          fecha_anterior: string | null;
          fecha_nueva: string | null;
          nota: string | null;
          modificado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cobro_id: string;
          monto_anterior?: number | null;
          monto_nuevo?: number | null;
          fecha_anterior?: string | null;
          fecha_nueva?: string | null;
          nota?: string | null;
          modificado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cobro_id?: string;
          monto_anterior?: number | null;
          monto_nuevo?: number | null;
          fecha_anterior?: string | null;
          fecha_nueva?: string | null;
          nota?: string | null;
          modificado_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cobros_historial_cambios_cobro_id_fkey";
            columns: ["cobro_id"];
            isOneToOne: false;
            referencedRelation: "cobros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobros_historial_cambios_modificado_por_fkey";
            columns: ["modificado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
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
          fase_id: string;
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
          fase_id: string;
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
          fase_id?: string;
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
      carpetas: {
        Row: {
          id: string;
          nombre: string;
          seccion: "clientes" | "proyectos" | "comercial" | "finanzas" | "general";
          carpeta_padre_id: string | null;
          cliente_id: string | null;
          proyecto_id: string | null;
          es_automatica: boolean;
          creado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          seccion: "clientes" | "proyectos" | "comercial" | "finanzas" | "general";
          carpeta_padre_id?: string | null;
          cliente_id?: string | null;
          proyecto_id?: string | null;
          es_automatica?: boolean;
          creado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          seccion?: "clientes" | "proyectos" | "comercial" | "finanzas" | "general";
          carpeta_padre_id?: string | null;
          cliente_id?: string | null;
          proyecto_id?: string | null;
          es_automatica?: boolean;
          creado_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carpetas_carpeta_padre_id_fkey";
            columns: ["carpeta_padre_id"];
            isOneToOne: false;
            referencedRelation: "carpetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carpetas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carpetas_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          }
        ];
      };
      carpetas_compartidas: {
        Row: {
          id: string;
          carpeta_id: string;
          usuario_id: string;
          compartido_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          carpeta_id: string;
          usuario_id: string;
          compartido_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          carpeta_id?: string;
          usuario_id?: string;
          compartido_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carpetas_compartidas_carpeta_id_fkey";
            columns: ["carpeta_id"];
            isOneToOne: false;
            referencedRelation: "carpetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carpetas_compartidas_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      cajas: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          color: string;
          activa: boolean;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          color: string;
          activa?: boolean;
          orden?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          color?: string;
          activa?: boolean;
          orden?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      comisiones: {
        Row: {
          id: string;
          vendedor_id: string;
          cliente_id: string;
          cotizacion_id: string | null;
          tipo: "venta";
          estado: "pendiente" | "pagada" | "cancelada";
          monto_venta: number;
          base_comision: number;
          porcentaje: number;
          monto_comision: number;
          config_comisiones_id: string | null;
          pagada_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendedor_id: string;
          cliente_id: string;
          cotizacion_id?: string | null;
          tipo?: "venta";
          estado?: "pendiente" | "pagada" | "cancelada";
          monto_venta: number;
          base_comision: number;
          porcentaje: number;
          monto_comision: number;
          config_comisiones_id?: string | null;
          pagada_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendedor_id?: string;
          cliente_id?: string;
          cotizacion_id?: string | null;
          tipo?: "venta";
          estado?: "pendiente" | "pagada" | "cancelada";
          monto_venta?: number;
          base_comision?: number;
          porcentaje?: number;
          monto_comision?: number;
          config_comisiones_id?: string | null;
          pagada_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comisiones_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comisiones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comisiones_cotizacion_id_fkey";
            columns: ["cotizacion_id"];
            isOneToOne: false;
            referencedRelation: "cotizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comisiones_config_comisiones_id_fkey";
            columns: ["config_comisiones_id"];
            isOneToOne: false;
            referencedRelation: "config_comisiones";
            referencedColumns: ["id"];
          }
        ];
      };
      config_comisiones: {
        Row: {
          id: string;
          piso_base_usd: number;
          tier_1_pct: number;
          tier_2_umbral_usd: number;
          tier_2_pct: number;
          bono_ventas_mes_umbral: number;
          bono_monto_usd: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          piso_base_usd: number;
          tier_1_pct: number;
          tier_2_umbral_usd: number;
          tier_2_pct: number;
          bono_ventas_mes_umbral: number;
          bono_monto_usd: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          piso_base_usd?: number;
          tier_1_pct?: number;
          tier_2_umbral_usd?: number;
          tier_2_pct?: number;
          bono_ventas_mes_umbral?: number;
          bono_monto_usd?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      archivos: {
        Row: {
          id: string;
          nombre: string;
          carpeta_id: string | null;
          storage_path: string;
          tipo_mime: string | null;
          tamanio_bytes: number | null;
          en_papelera: boolean;
          eliminado_at: string | null;
          subido_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          carpeta_id?: string | null;
          storage_path: string;
          tipo_mime?: string | null;
          tamanio_bytes?: number | null;
          en_papelera?: boolean;
          eliminado_at?: string | null;
          subido_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          carpeta_id?: string | null;
          storage_path?: string;
          tipo_mime?: string | null;
          tamanio_bytes?: number | null;
          en_papelera?: boolean;
          eliminado_at?: string | null;
          subido_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "archivos_carpeta_id_fkey";
            columns: ["carpeta_id"];
            isOneToOne: false;
            referencedRelation: "carpetas";
            referencedColumns: ["id"];
          }
        ];
      };
      tarjetas: {
        Row: {
          id: string;
          alias: string;
          banco: string | null;
          titular: string | null;
          ultimos_4: string;
          vencimiento: string | null;
          tipo: "debito" | "credito" | "prepaga";
          uso_habitual: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alias: string;
          banco?: string | null;
          titular?: string | null;
          ultimos_4: string;
          vencimiento?: string | null;
          tipo: "debito" | "credito" | "prepaga";
          uso_habitual?: string | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          alias?: string;
          banco?: string | null;
          titular?: string | null;
          ultimos_4?: string;
          vencimiento?: string | null;
          tipo?: "debito" | "credito" | "prepaga";
          uso_habitual?: string | null;
          notas?: string | null;
          created_at?: string;
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
          categoria:
            | "dominios"
            | "hosting_infraestructura"
            | "herramientas_software"
            | "marketing_ads"
            | "impuestos_contable"
            | "sueldos_honorarios"
            | "comisiones"
            | "otro";
          monto: number;
          fecha: string;
          recurrente: boolean;
          cuenta_medio: string | null;
          pagado: boolean;
          fecha_pago: string | null;
          proyecto_id: string | null;
          comision_id: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          concepto: string;
          categoria:
            | "dominios"
            | "hosting_infraestructura"
            | "herramientas_software"
            | "marketing_ads"
            | "impuestos_contable"
            | "sueldos_honorarios"
            | "comisiones"
            | "otro";
          monto: number;
          fecha: string;
          recurrente?: boolean;
          cuenta_medio?: string | null;
          pagado?: boolean;
          fecha_pago?: string | null;
          proyecto_id?: string | null;
          comision_id?: string | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          concepto?: string;
          categoria?:
            | "dominios"
            | "hosting_infraestructura"
            | "herramientas_software"
            | "marketing_ads"
            | "impuestos_contable"
            | "sueldos_honorarios"
            | "comisiones"
            | "otro";
          monto?: number;
          fecha?: string;
          recurrente?: boolean;
          cuenta_medio?: string | null;
          pagado?: boolean;
          fecha_pago?: string | null;
          proyecto_id?: string | null;
          comision_id?: string | null;
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
      eventos_invitados: {
        Row: {
          id: string;
          evento_id: string;
          usuario_id: string;
          estado: "pendiente" | "aceptado" | "rechazado" | "propuesta_alternativa";
          fecha_propuesta_alt: string | null;
          hora_propuesta_alt: string | null;
          comentario: string | null;
          respondido_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          evento_id: string;
          usuario_id: string;
          estado?: "pendiente" | "aceptado" | "rechazado" | "propuesta_alternativa";
          fecha_propuesta_alt?: string | null;
          hora_propuesta_alt?: string | null;
          comentario?: string | null;
          respondido_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          evento_id?: string;
          usuario_id?: string;
          estado?: "pendiente" | "aceptado" | "rechazado" | "propuesta_alternativa";
          fecha_propuesta_alt?: string | null;
          hora_propuesta_alt?: string | null;
          comentario?: string | null;
          respondido_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_invitados_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_invitados_usuario_id_fkey";
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
            | "ganado"
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
          monto_propuesto_desarrollo: number | null;
          monto_propuesto_mensual: number | null;
          monto_negociado_desarrollo: number | null;
          monto_negociado_mensual: number | null;
          motivo_descarte: string | null;
          notas: string | null;
          vendedor_id: string | null;
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
            | "ganado"
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
          monto_propuesto_desarrollo?: number | null;
          monto_propuesto_mensual?: number | null;
          monto_negociado_desarrollo?: number | null;
          monto_negociado_mensual?: number | null;
          motivo_descarte?: string | null;
          notas?: string | null;
          vendedor_id?: string | null;
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
            | "ganado"
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
          monto_propuesto_desarrollo?: number | null;
          monto_propuesto_mensual?: number | null;
          monto_negociado_desarrollo?: number | null;
          monto_negociado_mensual?: number | null;
          motivo_descarte?: string | null;
          notas?: string | null;
          vendedor_id?: string | null;
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
          },
          {
            foreignKeyName: "leads_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      leads_negociaciones: {
        Row: {
          id: string;
          lead_id: string;
          monto_anterior_desarrollo: number | null;
          monto_anterior_mensual: number | null;
          monto_nuevo_desarrollo: number | null;
          monto_nuevo_mensual: number | null;
          nota: string | null;
          creado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          monto_anterior_desarrollo?: number | null;
          monto_anterior_mensual?: number | null;
          monto_nuevo_desarrollo?: number | null;
          monto_nuevo_mensual?: number | null;
          nota?: string | null;
          creado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          monto_anterior_desarrollo?: number | null;
          monto_anterior_mensual?: number | null;
          monto_nuevo_desarrollo?: number | null;
          monto_nuevo_mensual?: number | null;
          nota?: string | null;
          creado_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_negociaciones_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_negociaciones_creado_por_fkey";
            columns: ["creado_por"];
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
          url_sistema: string | null;
          credenciales_cliente: Json | null;
          roadmap_pin: string | null;
          roadmap_token: string;
          roadmap_slug: string | null;
          roadmap_publico_activo: boolean;
          github_repo: string | null;
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
          url_sistema?: string | null;
          credenciales_cliente?: Json | null;
          roadmap_pin?: string | null;
          roadmap_token: string;
          roadmap_slug?: string | null;
          roadmap_publico_activo?: boolean;
          github_repo?: string | null;
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
          url_sistema?: string | null;
          credenciales_cliente?: Json | null;
          roadmap_pin?: string | null;
          roadmap_token?: string;
          roadmap_slug?: string | null;
          roadmap_publico_activo?: boolean;
          github_repo?: string | null;
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
      fases_proyecto: {
        Row: {
          id: string;
          proyecto_id: string;
          nombre: string;
          estado: "pendiente" | "en_curso" | "lista";
          prioridad: "alta" | "media" | "baja";
          orden: number;
          fecha_estimada_inicio: string | null;
          fecha_estimada_fin: string | null;
          descripcion: string | null;
          ai_dev_estado: "ninguno" | "planificando" | "codeando" | "pr_abierto" | "fallido";
          ai_dev_iniciado_at: string | null;
          ai_dev_error: string | null;
          pr_url: string | null;
          pr_numero: number | null;
          sql_pendiente: string | null;
          sql_ejecutado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          nombre: string;
          estado?: "pendiente" | "en_curso" | "lista";
          prioridad?: "alta" | "media" | "baja";
          orden?: number;
          fecha_estimada_inicio?: string | null;
          fecha_estimada_fin?: string | null;
          descripcion?: string | null;
          ai_dev_estado?: "ninguno" | "planificando" | "codeando" | "pr_abierto" | "fallido";
          ai_dev_iniciado_at?: string | null;
          ai_dev_error?: string | null;
          pr_url?: string | null;
          pr_numero?: number | null;
          sql_pendiente?: string | null;
          sql_ejecutado?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          nombre?: string;
          estado?: "pendiente" | "en_curso" | "lista";
          prioridad?: "alta" | "media" | "baja";
          orden?: number;
          fecha_estimada_inicio?: string | null;
          fecha_estimada_fin?: string | null;
          descripcion?: string | null;
          ai_dev_estado?: "ninguno" | "planificando" | "codeando" | "pr_abierto" | "fallido";
          ai_dev_iniciado_at?: string | null;
          ai_dev_error?: string | null;
          pr_url?: string | null;
          pr_numero?: number | null;
          sql_pendiente?: string | null;
          sql_ejecutado?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fases_proyecto_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          }
        ];
      };
      carpetas_notas: {
        Row: {
          id: string;
          nombre: string;
          orden: number;
          creado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          orden?: number;
          creado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          orden?: number;
          creado_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carpetas_notas_creado_por_fkey";
            columns: ["creado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      notas: {
        Row: {
          id: string;
          titulo: string;
          contenido: Json;
          carpeta_id: string | null;
          fijada: boolean;
          en_papelera: boolean;
          eliminada_at: string | null;
          cliente_id: string | null;
          proyecto_id: string | null;
          lead_id: string | null;
          tags: string[] | null;
          creado_por: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          contenido?: Json;
          carpeta_id?: string | null;
          fijada?: boolean;
          en_papelera?: boolean;
          eliminada_at?: string | null;
          cliente_id?: string | null;
          proyecto_id?: string | null;
          lead_id?: string | null;
          tags?: string[] | null;
          creado_por?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          contenido?: Json;
          carpeta_id?: string | null;
          fijada?: boolean;
          en_papelera?: boolean;
          eliminada_at?: string | null;
          cliente_id?: string | null;
          proyecto_id?: string | null;
          lead_id?: string | null;
          tags?: string[] | null;
          creado_por?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notas_carpeta_id_fkey";
            columns: ["carpeta_id"];
            isOneToOne: false;
            referencedRelation: "carpetas_notas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_proyecto_id_fkey";
            columns: ["proyecto_id"];
            isOneToOne: false;
            referencedRelation: "proyectos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_creado_por_fkey";
            columns: ["creado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      notas_etiquetas: {
        Row: {
          id: string;
          nombre: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notas_compartidas: {
        Row: {
          id: string;
          nota_id: string;
          usuario_id: string;
          compartida_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nota_id: string;
          usuario_id: string;
          compartida_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nota_id?: string;
          usuario_id?: string;
          compartida_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notas_compartidas_nota_id_fkey";
            columns: ["nota_id"];
            isOneToOne: false;
            referencedRelation: "notas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_compartidas_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notas_compartidas_compartida_por_fkey";
            columns: ["compartida_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      wiki_categorias: {
        Row: {
          id: string;
          nombre: string;
          orden: number;
          creado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          orden?: number;
          creado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          orden?: number;
          creado_por?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wiki_categorias_creado_por_fkey";
            columns: ["creado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      wiki_articulos: {
        Row: {
          id: string;
          titulo: string;
          contenido: Json;
          categoria_id: string | null;
          orden: number;
          creado_por: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          contenido?: Json;
          categoria_id?: string | null;
          orden?: number;
          creado_por?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          contenido?: Json;
          categoria_id?: string | null;
          orden?: number;
          creado_por?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wiki_articulos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "wiki_categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wiki_articulos_creado_por_fkey";
            columns: ["creado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      sesiones_tiempo: {
        Row: {
          id: string;
          fase_id: string;
          usuario_id: string | null;
          inicio: string;
          fin: string | null;
          duracion_segundos: number | null;
          nota: string | null;
          es_ia: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          fase_id: string;
          usuario_id?: string | null;
          inicio?: string;
          fin?: string | null;
          duracion_segundos?: number | null;
          nota?: string | null;
          es_ia?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          fase_id?: string;
          usuario_id?: string | null;
          inicio?: string;
          fin?: string | null;
          duracion_segundos?: number | null;
          nota?: string | null;
          es_ia?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sesiones_tiempo_fase_id_fkey";
            columns: ["fase_id"];
            isOneToOne: false;
            referencedRelation: "fases_proyecto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sesiones_tiempo_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_dev_ejecuciones: {
        Row: {
          id: string;
          fase_id: string;
          modelo_orquestador: string;
          modelo_implementacion: string;
          estado: "en_curso" | "completado" | "fallido";
          pr_url: string | null;
          tokens_entrada: number | null;
          tokens_salida: number | null;
          costo_estimado_usd: number | null;
          iniciado_por: string | null;
          iniciado_at: string;
          finalizado_at: string | null;
        };
        Insert: {
          id?: string;
          fase_id: string;
          modelo_orquestador: string;
          modelo_implementacion: string;
          estado?: "en_curso" | "completado" | "fallido";
          pr_url?: string | null;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          costo_estimado_usd?: number | null;
          iniciado_por?: string | null;
          iniciado_at?: string;
          finalizado_at?: string | null;
        };
        Update: {
          id?: string;
          fase_id?: string;
          modelo_orquestador?: string;
          modelo_implementacion?: string;
          estado?: "en_curso" | "completado" | "fallido";
          pr_url?: string | null;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          costo_estimado_usd?: number | null;
          iniciado_por?: string | null;
          iniciado_at?: string;
          finalizado_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_dev_ejecuciones_fase_id_fkey";
            columns: ["fase_id"];
            isOneToOne: false;
            referencedRelation: "fases_proyecto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_dev_ejecuciones_iniciado_por_fkey";
            columns: ["iniciado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      checklist_qa: {
        Row: {
          id: string;
          fase_id: string;
          item: string;
          completado: boolean;
          completado_por: string | null;
          completado_at: string | null;
          orden: number;
          generado_por_ia: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          fase_id: string;
          item: string;
          completado?: boolean;
          completado_por?: string | null;
          completado_at?: string | null;
          orden?: number;
          generado_por_ia?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          fase_id?: string;
          item?: string;
          completado?: boolean;
          completado_por?: string | null;
          completado_at?: string | null;
          orden?: number;
          generado_por_ia?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_qa_fase_id_fkey";
            columns: ["fase_id"];
            isOneToOne: false;
            referencedRelation: "fases_proyecto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_qa_completado_por_fkey";
            columns: ["completado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      productos: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          precio_mensual_default: number | null;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          descripcion?: string | null;
          precio_mensual_default?: number | null;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          descripcion?: string | null;
          precio_mensual_default?: number | null;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      producto_planes: {
        Row: {
          id: string;
          producto_id: string;
          nombre: string;
          precio_mensual: number;
          descripcion: string | null;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          nombre: string;
          precio_mensual: number;
          descripcion?: string | null;
          orden?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          nombre?: string;
          precio_mensual?: number;
          descripcion?: string | null;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producto_planes_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          }
        ];
      };
      producto_features: {
        Row: {
          id: string;
          producto_id: string;
          titulo: string;
          descripcion: string | null;
          estado: "idea" | "planificado" | "en_desarrollo" | "lanzado";
          prioridad: "alta" | "media" | "baja";
          solicitado_por_cliente_id: string | null;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          titulo: string;
          descripcion?: string | null;
          estado?: "idea" | "planificado" | "en_desarrollo" | "lanzado";
          prioridad?: "alta" | "media" | "baja";
          solicitado_por_cliente_id?: string | null;
          orden?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          titulo?: string;
          descripcion?: string | null;
          estado?: "idea" | "planificado" | "en_desarrollo" | "lanzado";
          prioridad?: "alta" | "media" | "baja";
          solicitado_por_cliente_id?: string | null;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producto_features_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producto_features_solicitado_por_cliente_id_fkey";
            columns: ["solicitado_por_cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          }
        ];
      };
      suscripciones: {
        Row: {
          id: string;
          cliente_id: string;
          proyecto_id: string | null;
          cotizacion_id: string | null;
          producto_id: string | null;
          plan_id: string | null;
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
          cotizacion_id?: string | null;
          producto_id?: string | null;
          plan_id?: string | null;
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
          cotizacion_id?: string | null;
          producto_id?: string | null;
          plan_id?: string | null;
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
            foreignKeyName: "suscripciones_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suscripciones_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "producto_planes";
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
          lead_id: string | null;
          feature_id: string | null;
          responsable_id: string | null;
          prioridad: "alta" | "media" | "baja";
          fecha_limite: string | null;
          estado: "nueva" | "en_proceso" | "terminada";
          notas: string | null;
          es_ia: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          proyecto_id?: string | null;
          lead_id?: string | null;
          feature_id?: string | null;
          responsable_id?: string | null;
          prioridad?: "alta" | "media" | "baja";
          fecha_limite?: string | null;
          estado?: "nueva" | "en_proceso" | "terminada";
          notas?: string | null;
          es_ia?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          proyecto_id?: string | null;
          lead_id?: string | null;
          feature_id?: string | null;
          responsable_id?: string | null;
          prioridad?: "alta" | "media" | "baja";
          fecha_limite?: string | null;
          estado?: "nueva" | "en_proceso" | "terminada";
          notas?: string | null;
          es_ia?: boolean;
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
            foreignKeyName: "tareas_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
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
          rol: "admin" | "miembro" | "comercial";
          google_calendar_token: string | null;
          foto_url: string | null;
          supervisor_id: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          rol?: "admin" | "miembro" | "comercial";
          google_calendar_token?: string | null;
          foto_url?: string | null;
          supervisor_id?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
          rol?: "admin" | "miembro" | "comercial";
          google_calendar_token?: string | null;
          foto_url?: string | null;
          supervisor_id?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usuarios_supervisor_id_fkey";
            columns: ["supervisor_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
