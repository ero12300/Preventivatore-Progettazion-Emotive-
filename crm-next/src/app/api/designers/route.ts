import { NextRequest, NextResponse } from "next/server";
import { listDesigners } from "@/lib/server/practice-repository";
import { requireCrmAuth } from "@/lib/server/route-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCrmAuth(req);
    if (!auth.ok) return auth.response;
    const designers = await listDesigners();
    return NextResponse.json({ ok: true, designers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore lettura progettisti.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
