import { describe, expect, it } from "vitest";
import {
  executeDocumentationComplete,
  executePaymentReceived,
  executeQuoteAccepted,
  PracticeWorkflowRepo,
} from "./practice-workflow";
import { PracticeRecord } from "../practice-types";

function makePractice(status: PracticeRecord["status"]): PracticeRecord {
  return {
    id: "practice-1",
    reference_code: "EMO-001",
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
    quote_accepted_at: null,
    followup_count: 0,
    followup_last_sent_at: null,
    next_followup_at: null,
    followup_last_message: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeRepo(initial: PracticeRecord) {
  let state = { ...initial };
  const logs: string[] = [];
  const repo: PracticeWorkflowRepo = {
    async getPracticeById() {
      return { ...state };
    },
    async updatePractice(_, patch) {
      state = { ...state, ...patch, updated_at: new Date().toISOString() };
      return { ...state };
    },
    async insertActivity(input) {
      logs.push(input.action_key);
    },
  };
  return { repo, logs, getState: () => ({ ...state }) };
}

describe("practice-workflow", () => {
  it("applica pagamento_ricevuto e scrive log", async () => {
    const { repo, logs, getState } = makeRepo(makePractice("preventivo_inviato"));
    const result = await executePaymentReceived(repo, "practice-1");
    expect(result.status).toBe("in_attesa_documenti");
    expect(result.payment_received_at).toBeTruthy();
    expect(logs).toContain("pagamento_ricevuto");
    expect(getState().status).toBe("in_attesa_documenti");
  });

  it("blocca pagamento_ricevuto su stato non valido", async () => {
    const { repo } = makeRepo(makePractice("in_attesa_documenti"));
    await expect(executePaymentReceived(repo, "practice-1")).rejects.toThrow(
      "Transizione non valida"
    );
  });

  it("applica documentazione_completa con booking link e log", async () => {
    const { repo, logs } = makeRepo(makePractice("in_attesa_documenti"));
    const scheduler = {
      async createBookingLink() {
        return { bookingUrl: "https://scheduler.stub.local/calendly/book?practiceId=practice-1" };
      },
    };
    const result = await executeDocumentationComplete(
      repo,
      scheduler,
      "practice-1"
    );
    expect(result.status).toBe("rilievo_da_prenotare");
    expect(result.booking_link_url).toContain("scheduler.stub.local");
    expect(result.documents_completed_at).toBeTruthy();
    expect(logs).toContain("documentazione_completa");
  });

  it("marca quote_accepted e azzera next_followup", async () => {
    const { repo, logs } = makeRepo(makePractice("preventivo_inviato"));
    const result = await executeQuoteAccepted(repo, "practice-1");
    expect(result.quote_accepted_at).toBeTruthy();
    expect(result.next_followup_at).toBeNull();
    expect(logs).toContain("quote_accepted");
  });
});
