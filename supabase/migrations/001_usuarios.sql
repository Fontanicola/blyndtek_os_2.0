-- Tabla usuarios (extiende auth.users de Supabase)
CREATE TABLE public.usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  email       text NOT NULL UNIQUE,
  rol         text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'miembro')),
  google_calendar_token text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden leer su propio registro
CREATE POLICY "usuarios_select_own"
  ON public.usuarios FOR SELECT
  USING (auth.uid() = id);

-- Solo admin puede leer todos los usuarios
CREATE POLICY "usuarios_select_admin"
  ON public.usuarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

-- Solo el propio usuario puede actualizar su registro
-- (excepto el campo rol, que solo admin puede cambiar — se maneja en API)
CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: al crearse un usuario en auth.users, crear su registro en public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    'miembro'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
