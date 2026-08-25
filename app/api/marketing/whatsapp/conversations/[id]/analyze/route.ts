import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { analyzeWhatsappConversation } from "@/lib/marketing/whatsapp-intelligence";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["admin", "marketing"].includes(user.rol))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  try {
    return NextResponse.json({
      data: await analyzeWhatsappConversation(params.id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar la conversación.",
      },
      { status: 500 },
    );
  }
}
