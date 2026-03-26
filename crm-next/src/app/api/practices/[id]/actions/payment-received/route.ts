import { NextRequest, NextResponse } from "next/server";
import { workflowActionPayloadSchema } from "@/lib/practice-schemas";
import { executePaymentReceived } from "@/lib/server/practice-workflow";
import { practiceWorkflowRepo } from "@/lib/server/practice-repository";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const payload = workflowActionPayloadSchema.parse(body);

    const practice = await executePaymentReceived(practiceWorkflowRepo, id, {
      actorUserId: payload.actor_user_id ?? null,
    });
    return NextResponse.json({ ok: true, practice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore azione pagamento_ricevuto.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
