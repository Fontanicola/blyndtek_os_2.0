import { createAdminClient, todayISO } from "../_shared/supabase.ts";

Deno.serve(async () => {
  try {
    const supabase = createAdminClient();
    const hoy = todayISO();

    const { data, error } = await supabase
      .from("cobros")
      .update({ estado: "vencido" })
      .eq("estado", "pendiente")
      .lt("fecha_vencimiento", hoy)
      .select("id");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      data: {
        vencidos: data?.length ?? 0
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
});
