import { NextRequest, NextResponse } from "next/server";
import { createPracticeSchema } from "@/lib/practice-schemas";
import {
  createClient,
  createPractice,
  listPractices,
  practiceWorkflowRepo,
} from "@/lib/server/practice-repository";
import { sendDesignerTaskNotification } from "@/lib/server/designer-notifications";
import { requireCrmAuth } from "@/lib/server/route-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCrmAuth(req);
    if (!auth.ok) return auth.response;
    const practices = await listPractices();
    return NextResponse.json({ ok: true, practices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore lettura pratiche.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCrmAuth(req);
    if (!auth.ok) return auth.response;
    const payload = createPracticeSchema.parse(await req.json());
    if (!payload.assigned_designer_id) {
      return NextResponse.json(
        { ok: false, message: "Seleziona un progettista prima di creare la pratica." },
        { status: 400 }
      );
    }
    const clientId = await createClient(payload.client);
    const practice = await createPractice({
      reference_code: payload.reference_code,
      client_id: clientId,
      square_meters: payload.square_meters,
      quote_amount: payload.quote_amount,
      deposit_amount: payload.deposit_amount,
      balance_amount: payload.balance_amount,
      assigned_designer_id: payload.assigned_designer_id,
    });

    await practiceWorkflowRepo.insertActivity({
      practice_id: practice.id,
      actor_user_id: null,
      trigger_source: "manual_controlled",
      action_key: "practice_created",
      description: "Pratica creata con stato iniziale preventivo_inviato.",
      payload: {
        reference_code: practice.reference_code,
      },
    });

    await sendDesignerTaskNotification(practice.id, "practice_created");

    return NextResponse.json({ ok: true, practice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore creazione pratica.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
