import { ActivityLogRecord, PracticeRecord } from "@/lib/practice-types";
import { SchedulerService } from "@/lib/server/scheduler-stub";

export type PracticeWorkflowRepo = {
  getPracticeById(id: string): Promise<PracticeRecord | null>;
  updatePractice(id: string, patch: Partial<PracticeRecord>): Promise<PracticeRecord>;
  insertActivity(input: ActivityLogRecord): Promise<void>;
};

type WorkflowContext = {
  actorUserId?: string | null;
};

export async function executePaymentReceived(
  repo: PracticeWorkflowRepo,
  practiceId: string,
  context: WorkflowContext = {}
) {
  const practice = await repo.getPracticeById(practiceId);
  if (!practice) throw new Error("Pratica non trovata.");
  if (practice.status !== "preventivo_inviato") {
    throw new Error("Transizione non valida: pagamento_ricevuto richiede stato preventivo_inviato.");
  }

  const now = new Date().toISOString();
  const updated = await repo.updatePractice(practiceId, {
    status: "in_attesa_documenti",
    payment_received_at: now,
  });

  await repo.insertActivity({
    practice_id: practiceId,
    actor_user_id: context.actorUserId ?? null,
    trigger_source: "admin_flag",
    action_key: "pagamento_ricevuto",
    description: "Pagamento ricevuto: pratica passata a in_attesa_documenti.",
    payload: { previous_status: practice.status, next_status: updated.status },
  });

  return updated;
}

export async function executeDocumentationComplete(
  repo: PracticeWorkflowRepo,
  scheduler: SchedulerService,
  practiceId: string,
  context: WorkflowContext = {}
) {
  const practice = await repo.getPracticeById(practiceId);
  if (!practice) throw new Error("Pratica non trovata.");
  if (practice.status !== "in_attesa_documenti") {
    throw new Error("Transizione non valida: documentazione_completa richiede stato in_attesa_documenti.");
  }

  const booking = await scheduler.createBookingLink({
    practiceId: practice.id,
    practiceReference: practice.reference_code,
    appointmentType: "rilievo_locale",
  });

  const now = new Date().toISOString();
  const updated = await repo.updatePractice(practiceId, {
    status: "rilievo_da_prenotare",
    documents_completed_at: now,
    booking_link_sent_at: now,
    booking_link_url: booking.bookingUrl,
    metadata: {
      ...(practice.metadata || {}),
      booking_link_url: booking.bookingUrl,
      booking_provider: practice.scheduler_provider,
    },
  });

  await repo.insertActivity({
    practice_id: practiceId,
    actor_user_id: context.actorUserId ?? null,
    trigger_source: "admin_flag",
    action_key: "documentazione_completa",
    description: "Documentazione completa: invio link rilievo e stato rilievo_da_prenotare.",
    payload: {
      previous_status: practice.status,
      next_status: updated.status,
      booking_link_url: booking.bookingUrl,
    },
  });

  return updated;
}

export async function executeQuoteAccepted(
  repo: PracticeWorkflowRepo,
  practiceId: string,
  context: WorkflowContext = {}
) {
  const practice = await repo.getPracticeById(practiceId);
  if (!practice) throw new Error("Pratica non trovata.");
  if (practice.quote_accepted_at) {
    throw new Error("Preventivo gia accettato.");
  }
  if (practice.status !== "preventivo_inviato") {
    throw new Error(
      "Transizione non valida: quote_accepted richiede stato preventivo_inviato."
    );
  }

  const now = new Date().toISOString();
  const updated = await repo.updatePractice(practiceId, {
    quote_accepted_at: now,
    next_followup_at: null,
  });

  await repo.insertActivity({
    practice_id: practiceId,
    actor_user_id: context.actorUserId ?? null,
    trigger_source: "admin_flag",
    action_key: "quote_accepted",
    description: "Preventivo accettato: follow-up disattivati per questa pratica.",
    payload: { previous_status: practice.status, accepted_at: now },
  });

  return updated;
}
