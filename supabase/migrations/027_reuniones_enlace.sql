-- Enlace de videollamada asociado a un evento local, Calendly o Google Calendar.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS enlace_reunion text;
