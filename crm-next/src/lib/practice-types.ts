import { PracticeStatus, SchedulerProvider } from "@/lib/crm-types";

export type PracticeRecord = {
  id: string;
  reference_code: string;
  client_id: string;
  status: PracticeStatus;
  scheduler_provider: SchedulerProvider;
  quote_amount: number;
  deposit_amount: number;
  balance_amount: number;
  square_meters: number | null;
  assigned_designer_id: string | null;
  booking_link_sent_at: string | null;
  booking_link_url: string | null;
  payment_received_at: string | null;
  documents_completed_at: string | null;
  quote_sent_at: string;
  quote_accepted_at: string | null;
  followup_count: number;
  followup_last_sent_at: string | null;
  next_followup_at: string | null;
  followup_last_message: string | null;
  external_booking_uid: string | null;
  external_event_start_at: string | null;
  appointment_confirmed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ActivityLogRecord = {
  practice_id: string;
  actor_user_id: string | null;
  trigger_source:
    | "status_change"
    | "admin_flag"
    | "event_completion"
    | "webhook_external"
    | "manual_controlled";
  action_key: string;
  description: string;
  payload?: Record<string, unknown>;
};
