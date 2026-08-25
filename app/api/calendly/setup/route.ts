import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createCalendlyWebhookSubscription,
  getCalendlyCurrentUser,
  getCalendlyWebhookSubscriptions
} from "@/lib/calendly";
import { logServerError } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.rol !== "admin") {
      return NextResponse.json({ error: "Solo un administrador puede conectar Calendly." }, { status: 403 });
    }

    const webhookSecret = process.env.CALENDLY_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      return NextResponse.json({ error: "Falta configurar CALENDLY_WEBHOOK_SECRET en Vercel." }, { status: 400 });
    }

    const configuredWebhookUrl = process.env.CALENDLY_WEBHOOK_URL?.trim() ||
      `${new URL(request.url).origin}/api/webhooks/calendly`;
    const webhookUrlObject = new URL(configuredWebhookUrl);
    webhookUrlObject.searchParams.set("secret", webhookSecret);
    const webhookUrl = webhookUrlObject.toString();
    const calendlyUser = await getCalendlyCurrentUser();
    const userUri = calendlyUser.resource?.uri;

    if (!userUri) {
      return NextResponse.json({ error: "Calendly no devolvió la URI del usuario conectado." }, { status: 502 });
    }

    const existing = await getCalendlyWebhookSubscriptions(userUri);
    const alreadyConfigured = (existing.collection ?? []).find((subscription) => subscription?.callback_url === webhookUrl);

    if (alreadyConfigured) {
      return NextResponse.json({ data: { configured: true, webhook: alreadyConfigured } });
    }

    const created = await createCalendlyWebhookSubscription({
      callbackUrl: webhookUrl,
      userUri,
      events: ["invitee.created", "invitee.canceled"]
    });

    return NextResponse.json({ data: { configured: true, webhook: created.resource ?? null } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo configurar Calendly.";
    logServerError("calendly.setup", error);
    const isConfiguration = message.startsWith("Falta configurar CALENDLY_");
    return NextResponse.json({ error: message, code: isConfiguration ? "integration_configuration" : "calendly_setup_failed" }, { status: isConfiguration ? 409 : 502 });
  }
}
