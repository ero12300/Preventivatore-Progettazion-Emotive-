import { ActivityLogRecord, PracticeRecord } from "../practice-types";

type CalcomWebhookRepo = {
  getPracticeById(id: string): Promise<PracticeRecord | null>;
  getPracticeByReferenceCode(referenceCode: string): Promise<PracticeRecord | null>;
  updatePractice(id: string, patch: Partial<PracticeRecord>): Promise<PracticeRecord>;
  insertActivity(input: ActivityLogRecord): Promise<void>;
};

function pickString(payload: unknown, keys: string[]): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const nested = pickString(value, keys);
      if (nested) return nested;
    }
  }
  return null;
}

function extractFromQuery(payloadText: string, key: "practice_id" | "practice_ref"): string | null {
  const regex = new RegExp(`${key}=([^&\\s"']+)`, "i");
  const match = payloadText.match(regex);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function extractCalcomPracticePointers(payload: unknown) {
  const practiceId =
    pickString(payload, ["practice_id", "practiceId"]) ||
    extractFromQuery(JSON.stringify(payload || {}), "practice_id");
  const practiceRef =
    pickString(payload, ["practice_ref", "practiceRef", "reference_code", "referenceCode"]) ||
    extractFromQuery(JSON.stringify(payload || {}), "practice_ref");
  const bookingUid = pickString(payload, ["uid", "booking_uid", "bookingUid"]);
  const eventStart = pickString(payload, ["startTime", "start_time", "start"]);
  return { practiceId, practiceRef, bookingUid, eventStart };
}

export async function handleCalcomBookingCreated(
  repo: CalcomWebhookRepo,
  payload: unknown
) {
  const pointers = extractCalcomPracticePointers(payload);
  let practice: PracticeRecord | null = null;

  if (pointers.practiceId) {
    practice = await repo.getPracticeById(pointers.practiceId);
  }
  if (!practice && pointers.practiceRef) {
    practice = await repo.getPracticeByReferenceCode(pointers.practiceRef);
  }
  if (!practice) {
    throw new Error("Webhook Cal.com: pratica non trovata.");
  }

  const now = new Date().toISOString();
  const updated = await repo.updatePractice(practice.id, {
    status: "rilievo_prenotato",
    external_booking_uid: pointers.bookingUid || practice.external_booking_uid,
    external_event_start_at: pointers.eventStart || practice.external_event_start_at,
    appointment_confirmed_at: now,
  });

  await repo.insertActivity({
    practice_id: practice.id,
    actor_user_id: null,
    trigger_source: "webhook_external",
    action_key: "calcom_booking_created",
    description: "Webhook Cal.com ricevuto: appuntamento rilievo prenotato.",
    payload: {
      booking_uid: pointers.bookingUid || null,
      event_start: pointers.eventStart || null,
      practice_ref: pointers.practiceRef || null,
    },
  });

  return updated;
}
