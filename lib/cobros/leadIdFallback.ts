import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type CobroInsert = Database["public"]["Tables"]["cobros"]["Insert"];

type CobroLeadIdError = {
  code?: string;
  message?: string;
};

function isMissingCobrosLeadIdColumn(error: CobroLeadIdError | null | undefined) {
  if (!error) {
    return false;
  }

  return error.code === "42703" && error.message?.includes("cobros.lead_id") === true;
}

function stripLeadId<T extends CobroInsert | CobroInsert[]>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map(({ lead_id: _leadId, ...rest }) => {
      void _leadId;
      return rest;
    }) as T;
  }

  const { lead_id: _leadId, ...rest } = payload;
  void _leadId;
  return rest as T;
}

export async function insertCobrosWithLeadIdFallback<TData = unknown>(
  supabase: SupabaseClient<Database>,
  payload: CobroInsert | CobroInsert[],
  selectClause = "*",
  options?: { single?: boolean }
) {
  const buildInsert = (insertPayload: CobroInsert | CobroInsert[]) => {
    const query = supabase.from("cobros").insert(insertPayload).select(selectClause);
    return options?.single ? query.single() : query;
  };

  const initialResult = await buildInsert(payload);

  if (!initialResult.error) {
    return initialResult as unknown as { data: TData; error: null };
  }

  if (!isMissingCobrosLeadIdColumn(initialResult.error)) {
    return initialResult as unknown as { data: TData; error: typeof initialResult.error };
  }

  console.warn("[cobros] La columna cobros.lead_id no existe en este entorno. Reintentando insert sin ese campo.");

  return (await buildInsert(stripLeadId(payload))) as unknown as {
    data: TData;
    error: typeof initialResult.error | null;
  };
}

export async function selectCobrosByLeadIdWithFallback<TData = unknown>(
  supabase: SupabaseClient<Database>,
  leadId: string,
  selectClause: string
) {
  const initialResult = await supabase.from("cobros").select(selectClause).eq("lead_id", leadId);

  if (!initialResult.error) {
    return initialResult as unknown as { data: TData; error: null };
  }

  if (!isMissingCobrosLeadIdColumn(initialResult.error)) {
    return initialResult as unknown as { data: TData; error: typeof initialResult.error };
  }

  console.warn("[cobros] La columna cobros.lead_id no existe en este entorno. Se omite el lookup por lead_id.");

  return {
    data: [] as unknown as TData,
    error: null
  };
}
