-- Calendly se integra como fuente externa de eventos, sin reemplazar Google Calendar.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS calendly_event_id text,
  ADD COLUMN IF NOT EXISTS calendly_invitee_uri text;

CREATE UNIQUE INDEX IF NOT EXISTS eventos_calendly_event_id_unique
  ON public.eventos (calendly_event_id)
  WHERE calendly_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS eventos_calendly_invitee_uri_unique
  ON public.eventos (calendly_invitee_uri)
  WHERE calendly_invitee_uri IS NOT NULL;
