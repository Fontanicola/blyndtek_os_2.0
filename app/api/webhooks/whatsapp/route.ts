import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analyzeWhatsappConversation } from "@/lib/marketing/whatsapp-intelligence";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Message = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  referral?: Record<string, unknown>;
};
type Status = { id?: string; status?: string };
type Payload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Message[];
        statuses?: Status[];
      };
    }>;
  }>;
};

function validSignature(raw: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  return (
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

function eventTimestamp(value?: string) {
  const seconds = Number(value || 0);
  return seconds
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  )
    return new NextResponse(challenge || "", { status: 200 });
  return NextResponse.json(
    { error: "Verificación inválida." },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256")))
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const db = createUntypedAdminClient();
  const conversationsToAnalyze = new Set<string>();

  for (const entry of payload.entry ?? [])
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      for (const status of value.statuses ?? [])
        if (status.id)
          await db
            .from("whatsapp_messages")
            .update({ status: status.status || null })
            .eq("id", status.id);
      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) continue;
        const contact = (value.contacts ?? []).find(
          (item) => item.wa_id === message.from,
        );
        const normalizedPhone = message.from.replace(/\D/g, "");
        const { data: lead } = await db
          .from("leads")
          .select("id")
          .ilike("contacto_1_tel", `%${normalizedPhone.slice(-8)}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const messageAt = eventTimestamp(message.timestamp);
        const { data: previous } = await db
          .from("whatsapp_conversations")
          .select("id,first_message_at,message_count,unread_count")
          .eq("wa_id", message.from)
          .maybeSingle();
        const { data: conversation, error } = await db
          .from("whatsapp_conversations")
          .upsert(
            {
              wa_id: message.from,
              lead_id: lead?.id || null,
              phone_number_id: value.metadata?.phone_number_id || null,
              contact_name: contact?.profile?.name || null,
              referral: message.referral || {},
              first_message_at: previous?.first_message_at || messageAt,
              last_message_at: messageAt,
              message_count: Number(previous?.message_count || 0) + 1,
              unread_count: Number(previous?.unread_count || 0) + 1,
              status: "open",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wa_id" },
          )
          .select("id")
          .single();
        if (error || !conversation) continue;
        await db.from("whatsapp_messages").upsert({
          id: message.id,
          conversation_id: conversation.id,
          direction: "inbound",
          message_type: message.type || null,
          status: "received",
          text_preview: message.text?.body?.slice(0, 500) || null,
          timestamp: messageAt,
          raw: message,
        });
        conversationsToAnalyze.add(conversation.id);
      }
    }
  await Promise.allSettled(
    [...conversationsToAnalyze].map((id) =>
      analyzeWhatsappConversation(id, { useAi: false }),
    ),
  );
  return NextResponse.json({ received: true });
}
