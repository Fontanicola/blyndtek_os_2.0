/**
 * Stub documentado.
 *
 * La sincronización bidireccional completa ya vive en la app web
 * (route handler manual en /api/calendario/sync). Esta Edge Function
 * queda preparada para recibir la misma lógica cuando se unifique el
 * runtime o se extraigan helpers compartidos al paquete de funciones.
 */
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async () => {
  const supabase = createAdminClient();
  void supabase;

  return Response.json({
    data: {
      stub: true,
      message: "Sync Google Calendar stub: use the manual /api/calendario/sync route for now."
    }
  });
});
