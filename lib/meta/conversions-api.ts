import { createHash } from "node:crypto";

import { createUntypedAdminClient } from "@/lib/supabase/admin";

const GRAPH_API_VERSION = "v26.0";

type SendLeadEventInput = {
  email: string;
  eventId: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  ipAddress?: string;
  leadId: string;
  phone?: string;
  userAgent?: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function sendMetaLeadEvent(input: SendLeadEventInput) {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const supabase = createUntypedAdminClient();
  const baseRecord = {
    event_id: input.eventId,
    event_name: "Lead",
    lead_id: input.leadId,
    event_source_url: input.eventSourceUrl || null,
    attempts: 1,
    updated_at: new Date().toISOString()
  };

  if (!pixelId || !accessToken) {
    const error = "META_PIXEL_ID o META_ACCESS_TOKEN no configurado.";
    await supabase.from("meta_capi_events").upsert({ ...baseRecord, status: "skipped", error_message: error });
    return { ok: false, error };
  }

  const phone = normalizePhone(input.phone || "");
  const userData: Record<string, string | string[]> = {
    em: [sha256(input.email.trim().toLowerCase())],
    external_id: [sha256(input.leadId)]
  };

  if (phone) userData.ph = [sha256(phone)];
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.ipAddress && input.ipAddress !== "unknown") userData.client_ip_address = input.ipAddress;
  if (input.userAgent) userData.client_user_agent = input.userAgent;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              action_source: "website",
              event_id: input.eventId,
              event_name: "Lead",
              event_source_url: input.eventSourceUrl,
              event_time: Math.floor(Date.now() / 1000),
              user_data: userData
            }
          ]
        })
      }
    );
    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok || result.error) {
      const error = JSON.stringify(result).slice(0, 2000);
      await supabase.from("meta_capi_events").upsert({ ...baseRecord, status: "error", error_message: error, response: result });
      return { ok: false, error };
    }

    await supabase.from("meta_capi_events").upsert({
      ...baseRecord,
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
      response: result
    });
    return { ok: true, result };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Error desconocido enviando CAPI.";
    await supabase.from("meta_capi_events").upsert({ ...baseRecord, status: "error", error_message: error });
    return { ok: false, error };
  }
}

