import { describe, expect, it } from "vitest";
import { handleCalcomBookingCreated } from "./calcom-webhook";
import { PracticeRecord } from "../practice-types";

function makePractice(): PracticeRecord {
  return {
    id: "practice-1",
    reference_code: "EMO-REF-001",
    client_id: "client-1",
    status: "rilievo_da_prenotare",
    scheduler_provider: "calcom",
    quote_amount: 1200,
    deposit_amount: 360,
    balance_amount: 840,
    square_meters: 90,
    assigned_designer_id: null,
    booking_link_sent_at: null,
    booking_link_url: null,
    payment_received_at: null,
    documents_completed_at: null,
    quote_sent_at: null,
    quote_accepted_at: null,
    followup_count: 0,
    followup_last_sent_at: null,
    next_followup_at: null,
    followup_last_message: null,
    external_booking_uid: null,
    external_event_start_at: null,
    appointment_confirmed_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("handleCalcomBookingCreated", () => {
  it("aggiorna la pratica a rilievo_prenotato via practice_ref", async () => {
    const practice = makePractice();
    const activities: string[] = [];
    const updated = await handleCalcomBookingCreated(
      {
        getPracticeById: async () => null,
        getPracticeByReferenceCode: async (ref) => (ref === practice.reference_code ? practice : null),
        updatePractice: async (_id, patch) => ({ ...practice, ...patch }),
        insertActivity: async (entry) => {
          activities.push(entry.action_key);
        },
      },
      {
        triggerEvent: "BOOKING_CREATED",
        payload: {
          uid: "booking_123",
          startTime: "2026-03-30T09:00:00.000Z",
          bookingUrl: `https://cal.com/emotive/rilievo?practice_ref=${practice.reference_code}`,
        },
      }
    );

    expect(updated.status).toBe("rilievo_prenotato");
    expect(updated.external_booking_uid).toBe("booking_123");
    expect(updated.external_event_start_at).toBe("2026-03-30T09:00:00.000Z");
    expect(updated.appointment_confirmed_at).toBeTruthy();
    expect(activities).toContain("calcom_booking_created");
  });
});
