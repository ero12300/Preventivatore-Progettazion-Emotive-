import { PracticeStatus } from "@/lib/crm-types";

export type WorkflowTrigger =
  | "status_change"
  | "admin_flag"
  | "event_completion"
  | "webhook_external"
  | "manual_controlled";

export type WorkflowRule = {
  fromStatus?: PracticeStatus;
  toStatus: PracticeStatus;
  trigger: WorkflowTrigger;
  actions: string[];
};

export const FOUNDATION_WORKFLOW_RULES: WorkflowRule[] = [
  {
    fromStatus: "preventivo_inviato",
    toStatus: "in_attesa_documenti",
    trigger: "admin_flag",
    actions: [
      "send_email_document_request",
      "enable_mobile_document_upload",
      "activity_log_pagamento_ricevuto",
    ],
  },
  {
    fromStatus: "in_attesa_documenti",
    toStatus: "rilievo_da_prenotare",
    trigger: "admin_flag",
    actions: [
      "send_booking_link_rilievo",
      "mark_booking_link_sent",
      "activity_log_documentazione_completa",
    ],
  },
];
