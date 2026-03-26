import { NextResponse } from "next/server";
import { listDesigners } from "@/lib/server/practice-repository";

export async function GET() {
  try {
    const designers = await listDesigners();
    return NextResponse.json({ ok: true, designers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore lettura progettisti.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
