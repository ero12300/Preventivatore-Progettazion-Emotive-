import { describe, expect, it } from "vitest";
import { executeFollowupReminder } from "./followup-flow";
import { PracticeRecord } from "../practice-types";

function makePractice(status: PracticeRecord["status"], accepted = false): PracticeRecord {
  return {
    id: "practice-fu-1",
    reference_code: "EMO-FU-001",
    client_id: "client-1",
    status,
    scheduler_provider: "calendly",
    quote_amount: 1000,
    deposit_amount: 300,
    balance_amount: 700,
    square_meters: 120,
    assigned_designer_id: null,
    booking_link_sent_at: null,
    booking_link_url: null,
    payment_received_at: null,
    documents_completed_at: null,
    quote_sent_at: new Date().toISOString(),
    quote_accepted_at: accepted ? new Date().toISOString() : null,
    followup_count: 0,
    followup_last_sent_at: null,
    next_followup_at: null,
    followup_last_message: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("followup-flow", () => {
  it("invia follow-up stage 1 su preventivo non accettato", async () => {
    let practice = makePractice("preventivo_inviato");
    const logs: string[] = [];
    const repo = {
      async getPracticeById() {
        return practice;
      },
      async updatePractice(_: string, patch: Partial<PracticeRecord>) {
        practice = { ...practice, ...patch };
        return practice;
      },
      async insertActivity(input: { action_key: string }) {
        logs.push(input.action_key);
      },
    };

    const result = await executeFollowupReminder(repo, practice.id, null);
    expect(result.message.stage).toBe(1);
    expect(result.practice.followup_count).toBe(1);
    expect(result.practice.followup_last_message).toContain("Riepilogo proposta");
    expect(logs).toContain("followup_inviato");
  });

  it("blocca follow-up su stato diverso da preventivo_inviato", async () => {
    const repo = {
      async getPracticeById() {
        return makePractice("in_attesa_documenti");
      },
      async updatePractice() {
        throw new Error("should not update");
      },
      async insertActivity() {
        throw new Error("should not log");
      },
    };

    await expect(executeFollowupReminder(repo, "practice-fu-1")).rejects.toThrow(
      "Follow-up consentito solo su pratiche con stato preventivo_inviato."
    );
  });

  it("blocca follow-up se preventivo gia accettato", async () => {
    const repo = {
      async getPracticeById() {
        return makePractice("preventivo_inviato", true);
      },
      async updatePractice() {
        throw new Error("should not update");
      },
      async insertActivity() {
        throw new Error("should not log");
      },
    };

    await expect(executeFollowupReminder(repo, "practice-fu-1")).rejects.toThrow(
      "Preventivo gia accettato"
    );
  });
});
