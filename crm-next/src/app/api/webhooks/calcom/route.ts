import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  getPracticeById,
  getPracticeByReferenceCode,
  practiceWorkflowRepo,
} from "@/lib/server/practice-repository";
import { handleCalcomBookingCreated } from "@/lib/server/calcom-webhook";
import { sendDesignerTaskNotification } from "@/lib/server/designer-notifications";

function isBookingCreatedEvent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const event = (payload as Record<string, unknown>).triggerEvent;
  if (typeof event !== "string") return false;
  const normalized = event.toLowerCase();
  return normalized.includes("booking") && normalized.includes("created");
}

function getWebhookSecret(req: NextRequest): string | null {
  const fromHeader =
    req.headers.get("x-cal-webhook-secret") || req.headers.get("x-webhook-secret");
  return fromHeader?.trim() || null;
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = env.CRON_SECRET?.trim();
    const incomingSecret = getWebhookSecret(req);
    if (expectedSecret && incomingSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, message: "Webhook secret non valido." }, { status: 401 });
    }

    const payload = await req.json();
    if (!isBookingCreatedEvent(payload)) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "Evento non gestito (solo booking.created).",
      });
    }

    const updated = await handleCalcomBookingCreated(
      {
        getPracticeById,
        getPracticeByReferenceCode,
        updatePractice: practiceWorkflowRepo.updatePractice,
        insertActivity: practiceWorkflowRepo.insertActivity,
      },
      payload
    );
    await sendDesignerTaskNotification(updated.id, "booking_confirmed");

    return NextResponse.json({
      ok: true,
      practiceId: updated.id,
      status: updated.status,
      appointmentConfirmedAt: updated.appointment_confirmed_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore webhook Cal.com.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
