export type EstadoNewsletterSuscriptor = "activo" | "desuscripto" | "rebotado";

export type NewsletterSuscriptor = {
  id: string;
  email: string;
  nombre: string | null;
  empresa: string | null;
  estado: EstadoNewsletterSuscriptor;
  fuente: string | null;
  landing_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  visitor_id: string | null;
  web_session_id: string | null;
  consentimiento_at: string;
  desuscripto_at: string | null;
  created_at: string;
  updated_at: string;
};
