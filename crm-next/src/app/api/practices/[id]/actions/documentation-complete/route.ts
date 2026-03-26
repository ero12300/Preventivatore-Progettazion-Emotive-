import { NextRequest, NextResponse } from "next/server";
import { workflowActionPayloadSchema } from "@/lib/practice-schemas";
import { executeDocumentationComplete } from "@/lib/server/practice-workflow";
import { practiceWorkflowRepo } from "@/lib/server/practice-repository";
import { getSchedulerService } from "@/lib/server/scheduler-stub";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const payload = workflowActionPayloadSchema.parse(body);
    const scheduler = getSchedulerService();

    const practice = await executeDocumentationComplete(
      practiceWorkflowRepo,
      scheduler,
      id,
      { actorUserId: payload.actor_user_id ?? null }
    );

    return NextResponse.json({ ok: true, practice });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore azione documentazione_completa.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
