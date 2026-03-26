import { describe, expect, it } from "vitest";
import { runDailyFollowupJob } from "./followup-job";
import { PracticeRecord } from "../practice-types";

function practice(id: string, status: PracticeRecord["status"]): PracticeRecord {
  return {
    id,
    reference_code: `REF-${id}`,
    client_id: "c",
    status,
    scheduler_provider: "calendly",
    quote_amount: 1000,
    deposit_amount: 300,
    balance_amount: 700,
    square_meters: 100,
    assigned_designer_id: null,
    booking_link_sent_at: null,
    booking_link_url: null,
    payment_received_at: null,
    documents_completed_at: null,
    quote_sent_at: new Date().toISOString(),
    quote_accepted_at: null,
    followup_count: 0,
    followup_last_sent_at: null,
    next_followup_at: new Date(Date.now() - 10_000).toISOString(),
    followup_last_message: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("followup-job", () => {
  it("invia follow-up su pratiche dovute", async () => {
    const items = [practice("1", "preventivo_inviato"), practice("2", "preventivo_inviato")];
    const updated = new Map<string, PracticeRecord>();
    const repo = {
      async listDueFollowupPractices() {
        return items;
      },
      async getPracticeById(id: string) {
        return items.find((x) => x.id === id) ?? null;
      },
      async updatePractice(id: string, patch: Partial<PracticeRecord>) {
        const target = items.find((x) => x.id === id)!;
        const next = { ...target, ...patch };
        updated.set(id, next);
        return next;
      },
      async insertActivity() {},
    };

    const result = await runDailyFollowupJob(repo);
    expect(result.scanned).toBe(2);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(updated.get("1")?.followup_count).toBe(1);
  });
});
