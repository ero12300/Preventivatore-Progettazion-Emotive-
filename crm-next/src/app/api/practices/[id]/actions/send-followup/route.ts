import { NextRequest, NextResponse } from "next/server";
import { workflowActionPayloadSchema } from "@/lib/practice-schemas";
import { executeFollowupReminder } from "@/lib/server/followup-flow";
import { practiceWorkflowRepo } from "@/lib/server/practice-repository";
import { requireCrmAuth } from "@/lib/server/route-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireCrmAuth(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const payload = workflowActionPayloadSchema.parse(body);

    const result = await executeFollowupReminder(
      practiceWorkflowRepo,
      id,
      payload.actor_user_id ?? null
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore invio follow-up.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
