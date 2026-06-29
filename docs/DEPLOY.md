# Deploy

Esta guía deja el proyecto listo para producción en Vercel.

## 1. Conectar GitHub con Vercel

1. Entrá a Vercel.
2. Creá un proyecto nuevo desde GitHub.
3. Seleccioná el repo `fontanicola/blyndtek_os_2.0`.
4. Dejá el framework detectado como Next.js.
5. Deployá la rama principal.

## 2. Variables de entorno

Configurá estas variables en Vercel en los entornos `Production` y `Preview` si corresponde:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### Valores esperados

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key pública.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key, solo server-side.
- `ANTHROPIC_API_KEY`: clave de Claude API.
- `GOOGLE_CLIENT_ID`: client ID de Google OAuth.
- `GOOGLE_CLIENT_SECRET`: client secret de Google OAuth.
- `GOOGLE_REDIRECT_URI`: URL de callback de producción.

## 3. Dominio

1. En Vercel, agregá o confirmá el dominio de producción.
2. Verificá que el deploy responda en HTTPS.
3. Usá ese dominio como base para el callback de Google OAuth.

## 4. Google OAuth

Actualizá `GOOGLE_REDIRECT_URI` con la URL de producción:

```text
https://tu-dominio.com/api/auth/google/callback
```

Luego:

1. Entrá a Google Cloud Console.
2. Abrí las credenciales OAuth 2.0.
3. Agregá la URL de callback de producción en los redirect URIs autorizados.
4. Guardá los cambios.

## 5. Edge Functions y cron jobs

Las automatizaciones viven en Supabase, no en Vercel.

1. Desplegá las Edge Functions:
   - `cobros-mensuales`
   - `marcar-vencidos`
   - `sync-google-calendar`
2. Aplicá las migraciones:
   - `supabase/migrations/003_automatizaciones.sql`
   - `supabase/migrations/004_cron_jobs.sql`
3. Reemplazá en `004_cron_jobs.sql`:
   - `YOUR_PROJECT_REF`
   - `YOUR_SERVICE_ROLE_KEY`
4. Ejecutá el SQL en Supabase.

## 6. Configuración del repo para producción

- `next.config.mjs` ya incluye:
  - headers básicos de seguridad.
  - excepción de framing para `/roadmap` según la política actual.
  - dominio remoto de Supabase para imágenes.
- No es necesario agregar `vercel.json` en este repo mientras se mantengan los `maxDuration` en las route handlers que lo requieren.
- `window.location.origin` ya se usa para el link público del roadmap, por lo que adopta automáticamente el dominio de producción.

## 7. Verificación post-deploy

Después de publicar, revisá esta checklist:

- [ ] El login funciona en producción.
- [ ] El cotizador genera módulos con Claude API.
- [ ] La cascada de aceptación crea cliente, proyecto, features, suscripción y cobros.
- [ ] El roadmap público se abre sin auth.
- [ ] Los cron jobs de `cobros-mensuales` y `marcar-vencidos` corren.
- [ ] El sync de Google Calendar responde correctamente.
- [ ] Comercial funciona: Outbound, Inbound, Clientes y Cotizador.
- [ ] Entrega funciona: Proyectos, Tareas y Calendario.
- [ ] Control funciona: Finanzas y Dashboard.

## 8. Revisión rápida de seguridad

- Confirmá que `.env.local` no se subió al repo.
- Confirmá que las claves sensibles solo están en Vercel y en Supabase.
- Confirmá que `SUPABASE_SERVICE_ROLE_KEY` nunca se expone al frontend.
- Confirmá que `/roadmap` sigue accesible sin auth pero sin datos internos.
