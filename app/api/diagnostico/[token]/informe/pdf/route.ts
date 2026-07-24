import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    token: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  // The public report is the single source of truth for layout, typography and colors.
  // Opening it in print mode lets the browser produce an identical PDF instead of
  // maintaining a second, inevitably divergent PDFKit layout.
  const reportUrl = new URL(`/diagnostico/${encodeURIComponent(params.token)}/informe`, request.url);
  reportUrl.searchParams.set("print", "1");

  return NextResponse.redirect(reportUrl);
}
