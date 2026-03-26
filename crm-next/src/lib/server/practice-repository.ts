import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ActivityLogRecord, PracticeRecord } from "@/lib/practice-types";
import { PracticeWorkflowRepo } from "@/lib/server/practice-workflow";
import {
  mirrorActivityToAirtable,
  mirrorClientToAirtable,
  mirrorPracticeDeletionToAirtable,
  mirrorPracticeToAirtable,
} from "@/lib/server/airtable-mirror";

const PRACTICE_SELECT =
  "id,reference_code,client_id,status,scheduler_provider,quote_amount,deposit_amount,balance_amount,square_meters,assigned_designer_id,booking_link_sent_at,booking_link_url,payment_received_at,documents_completed_at,quote_sent_at,quote_accepted_at,followup_count,followup_last_sent_at,next_followup_at,followup_last_message,external_booking_uid,external_event_start_at,appointment_confirmed_at,metadata,created_at,updated_at";

function mapPractice(row: Record<string, unknown>): PracticeRecord {
  return {
    id: String(row.id),
    reference_code: String(row.reference_code),
    client_id: String(row.client_id),
    status: row.status as PracticeRecord["status"],
    scheduler_provider: row.scheduler_provider as PracticeRecord["scheduler_provider"],
    quote_amount: Number(row.quote_amount ?? 0),
    deposit_amount: Number(row.deposit_amount ?? 0),
    balance_amount: Number(row.balance_amount ?? 0),
    square_meters: row.square_meters == null ? null : Number(row.square_meters),
    assigned_designer_id: (row.assigned_designer_id as string | null) ?? null,
    booking_link_sent_at: (row.booking_link_sent_at as string | null) ?? null,
    booking_link_url: (row.booking_link_url as string | null) ?? null,
    payment_received_at: (row.payment_received_at as string | null) ?? null,
    documents_completed_at: (row.documents_completed_at as string | null) ?? null,
    quote_sent_at: String(row.quote_sent_at),
    quote_accepted_at: (row.quote_accepted_at as string | null) ?? null,
    followup_count: Number(row.followup_count ?? 0),
    followup_last_sent_at: (row.followup_last_sent_at as string | null) ?? null,
    next_followup_at: (row.next_followup_at as string | null) ?? null,
    followup_last_message: (row.followup_last_message as string | null) ?? null,
    external_booking_uid: (row.external_booking_uid as string | null) ?? null,
    external_event_start_at: (row.external_event_start_at as string | null) ?? null,
    appointment_confirmed_at: (row.appointment_confirmed_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listPractices() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(
      `${PRACTICE_SELECT},clients(id,full_name,email),project_designers(id,full_name,email)`
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPracticeById(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(PRACTICE_SELECT)
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;
  return mapPractice(data);
}

export async function getPracticeByReferenceCode(referenceCode: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(PRACTICE_SELECT)
    .eq("reference_code", referenceCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapPractice(data);
}

export async function createClient(input: {
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  vat_number?: string;
  city?: string;
  business_type?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase
    .from("clients")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing?.id) {
    const existingId = existing.id as string;
    await mirrorClientToAirtable({
      id: existingId,
      ...input,
    });
    return existingId;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await mirrorClientToAirtable({
    id: data.id as string,
    ...input,
  });
  return data.id as string;
}

export async function createPractice(input: {
  reference_code: string;
  client_id: string;
  square_meters?: number;
  quote_amount: number;
  deposit_amount: number;
  balance_amount: number;
  assigned_designer_id?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const provider = process.env.CRM_SCHEDULER_PROVIDER === "calcom" ? "calcom" : "calendly";
  const nextFollowupAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("practices")
    .insert({
      ...input,
      scheduler_provider: provider,
      status: "preventivo_inviato",
      next_followup_at: nextFollowupAt,
    })
    .select(PRACTICE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const practice = mapPractice(data);
  await mirrorPracticeToAirtable(practice.id);
  return practice;
}

export async function patchPractice(
  id: string,
  patch: Partial<{
    reference_code: string;
    square_meters: number | null;
    quote_amount: number;
    deposit_amount: number;
    balance_amount: number;
    assigned_designer_id: string | null;
  }>
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .update(patch)
    .eq("id", id)
    .select(PRACTICE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const practice = mapPractice(data);
  await mirrorPracticeToAirtable(practice.id);
  return practice;
}

export async function deletePractice(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("practices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await mirrorPracticeDeletionToAirtable(id);
}

export async function listDesigners() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_designers")
    .select("id,full_name,email,is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listDueFollowupPractices(nowIso: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(PRACTICE_SELECT)
    .eq("status", "preventivo_inviato")
    .is("quote_accepted_at", null)
    .not("next_followup_at", "is", null)
    .lte("next_followup_at", nowIso)
    .order("next_followup_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPractice(row as Record<string, unknown>));
}

export const practiceWorkflowRepo: PracticeWorkflowRepo = {
  async getPracticeById(id: string) {
    return getPracticeById(id);
  },
  async updatePractice(id: string, patch: Partial<PracticeRecord>) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("practices")
      .update(patch)
      .eq("id", id)
      .select(PRACTICE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    const practice = mapPractice(data);
    await mirrorPracticeToAirtable(practice.id);
    return practice;
  },
  async insertActivity(input: ActivityLogRecord) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("activity_log").insert({
      practice_id: input.practice_id,
      actor_user_id: input.actor_user_id,
      trigger_source: input.trigger_source,
      action_key: input.action_key,
      description: input.description,
      payload: input.payload ?? {},
    });
    if (error) throw new Error(error.message);
    await mirrorActivityToAirtable(input);
  },
};
