import { NextRequest, NextResponse } from "next/server";
import { patchPractice, deletePractice, getPracticeById } from "@/lib/server/practice-repository";
import { updatePracticeSchema } from "@/lib/practice-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const practice = await getPracticeById(id);
    if (!practice) {
      return NextResponse.json({ ok: false, message: "Pratica non trovata." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, practice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore lettura pratica.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const payload = updatePracticeSchema.parse(await req.json());
    const practice = await patchPractice(id, payload);
    return NextResponse.json({ ok: true, practice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore aggiornamento pratica.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await deletePractice(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore eliminazione pratica.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
