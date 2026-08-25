# Plan de lanzamiento Meta Ads — septiembre a diciembre de 2026

## Decisión

- Resultado: diagnósticos operativos pagos y oportunidades de desarrollo, no volumen de leads.
- Mercado inicial: Argentina.
- ICP: dueño, socio o gerente de una Pyme de 15 a 80 personas con operación manual o sistemas desconectados.
- Oferta: diagnóstico operativo de USD 600, descontable si luego se desarrolla con Blyndtek.
- Destino: `https://blyndtek.com/diagnostico-operativo`.
- Evento inicial: `Lead`; calidad y avance se juzgan en el CRM.
- Presupuesto total: USD 6.000 hasta el 31 de diciembre de 2026.

## Presupuesto protegido

| Uso | Techo |
|---|---:|
| Medios | USD 4.800 |
| Tracking, landing, CRM y producción | USD 600 |
| Reserva | USD 600 |

Techos de medios: septiembre USD 900, octubre USD 1.200, noviembre USD 1.300 y diciembre USD 1.400. El saldo no gastado no se fuerza.

La campaña parte en USD 35/día. El presupuesto sólo aumenta si el tracking está íntegro, ventas responde dentro del SLA y la cohorte genera leads que pasan los cinco filtros.

## Estructura inicial

```text
AR | Diagnóstico operativo | Prospecting | Leads | 2026-09
└── AR | Dueños y gerentes Pyme | Website | Broad
    ├── AR_DUENO_COSTO-OCULTO_VIDEO_H01_V01
    ├── AR_DUENO_COSTO-OCULTO_CARRUSEL_H01_V01
    ├── AR_DUENO_DEPENDENCIA_VIDEO_H01_V01
    ├── AR_GERENTE_DECISION-TARDIA_VIDEO_H01_V01
    ├── AR_GERENTE_SOFTWARE-AJUSTADO_CARRUSEL_H01_V01
    └── AR_DUENO_DIAGNOSTICO_VIDEO_H01_V01
```

Sin retargeting separado ni México en el arranque. Abrir México después de dos diagnósticos pagos o una oportunidad de desarrollo originada en Meta.

## URL y UTMs

```text
https://blyndtek.com/diagnostico-operativo?utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}
```

## Gates de activación

- [x] Business, cuenta, página, Instagram, píxel y usuario de sistema identificados.
- [x] Token de servidor con lectura y gestión, con fecha de vencimiento registrada.
- [x] CRM con campañas, alertas, cola de acciones y doble kill switch.
- [x] Landing y contrato de atribución corregidos.
- [x] Pixel y CAPI implementados con el mismo `event_id` para `Lead`.
- [x] Auditoría de eventos CAPI en Supabase.
- [ ] Lead de prueba completo confirmado en web, CRM, Pixel y Events Manager.
- [ ] Seis piezas finales revisadas en 9:16 y 4:5.
- [ ] Responsable comercial y SLA de primera respuesta asignados.
- [ ] Medio de pago y límite de gasto de cuenta confirmados.

No activar mientras exista un ítem pendiente.

## SLA comercial

- Primera respuesta: menos de 15 minutos en horario hábil; máximo 2 horas.
- Cinco intentos en siete días combinando WhatsApp, llamada y email.
- Registrar rol, tamaño, dolor, autoridad, presupuesto, disposición a pagar y motivo de descarte.
- `calificado` exige validación humana de dolor, decisión, capacidad y diagnóstico pago; nunca sólo el formulario.

## Reglas de decisión

- Pausa inmediata: landing caída, tracking roto, rechazo de política, fraude o gasto fuera del techo.
- Mantener: menos de 1× CPQL objetivo o muestra todavía inmadura.
- Revisar: 1–2× CPQL objetivo sin calificados.
- Candidato a pausa: 3× CPQL objetivo sin calificados, con tracking y SLA verificados y al menos siete días.
- Escalar: cohortes maduras dentro del techo de CPQL/CAC y capacidad de entrega disponible; aumentos reversibles de 15–20%.

## Campañas anteriores

Tres campañas 2025 se archivaron con prefijo `[LEGACY 2025]`. `Trafico BRICK` permanece pausada porque Meta rechaza cualquier edición por un reel eliminado. No puede gastar y no debe borrarse: conserva el historial.

