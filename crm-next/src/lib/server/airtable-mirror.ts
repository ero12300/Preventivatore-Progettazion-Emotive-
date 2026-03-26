import { ActivityLogRecord } from "@/lib/practice-types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

function getConfig() {
  const apiKey = (process.env.AIRTABLE_API_KEY || "").trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || "").trim();
  const practicesTable = (process.env.AIRTABLE_TABLE_PRACTICES || "CRM_Pratiche").trim();
  const clientsTable = (process.env.AIRTABLE_TABLE_CLIENTS || "CRM_Clienti").trim();
  const activitiesTable = (process.env.AIRTABLE_TABLE_ACTIVITY || "CRM_Attivita").trim();

  if (!apiKey || !baseId) return null;
  return { apiKey, baseId, practicesTable, clientsTable, activitiesTable };
}

async function airtableRequest(path: string, init?: RequestInit) {
  const cfg = getConfig();
  if (!cfg) return null;
  const response = await fetch(`${AIRTABLE_API_BASE}/${cfg.baseId}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function findRecordIdByField(table: string, field: string, value: string) {
  const formula = `{${field}}="${escapeFormulaValue(value)}"`;
  const query = new URLSearchParams({
    maxRecords: "1",
    filterByFormula: formula,
  });
  const json = await airtableRequest(`${encodeURIComponent(table)}?${query.toString()}`);
  const first = json?.records?.[0];
  return typeof first?.id === "string" ? first.id : null;
}

async function upsertByUniqueField(
  table: string,
  uniqueField: string,
  uniqueValue: string,
  fields: Record<string, unknown>
) {
  try {
    const recordId = await findRecordIdByField(table, uniqueField, uniqueValue);
    if (recordId) {
      await airtableRequest(encodeURIComponent(table), {
        method: "PATCH",
        body: JSON.stringify({
          records: [{ id: recordId, fields }],
        }),
      });
      return;
    }
    await airtableRequest(encodeURIComponent(table), {
      method: "POST",
      body: JSON.stringify({
        records: [{ fields }],
      }),
    });
  } catch (error) {
    console.warn("⚠️ Airtable mirror upsert failed:", error);
  }
}

export async function mirrorClientToAirtable(input: {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  vat_number?: string;
  city?: string;
  business_type?: string;
}) {
  const cfg = getConfig();
  if (!cfg) return;
  await upsertByUniqueField(cfg.clientsTable, "crm_client_id", input.id, {
    crm_client_id: input.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone || "",
    company_name: input.company_name || "",
    vat_number: input.vat_number || "",
    city: input.city || "",
    business_type: input.business_type || "",
    sync_updated_at: new Date().toISOString(),
  });
}

export async function mirrorPracticeToAirtable(practiceId: string) {
  const cfg = getConfig();
  if (!cfg) return;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(
      "id,reference_code,status,scheduler_provider,quote_amount,deposit_amount,balance_amount,square_meters,booking_link_url,booking_link_sent_at,payment_received_at,documents_completed_at,quote_sent_at,quote_accepted_at,followup_count,followup_last_sent_at,next_followup_at,followup_last_message,external_booking_uid,external_event_start_at,appointment_confirmed_at,created_at,updated_at,clients(id,full_name,email,phone,company_name,vat_number,city,business_type),project_designers(id,full_name,email)"
    )
    .eq("id", practiceId)
    .maybeSingle();
  if (error) {
    console.warn("⚠️ Airtable mirror read practice failed:", error.message);
    return;
  }
  if (!data) return;
  const clientRaw = data.clients as Record<string, unknown> | Record<string, unknown>[] | null;
  const designerRaw =
    data.project_designers as Record<string, unknown> | Record<string, unknown>[] | null;
  const client = Array.isArray(clientRaw) ? clientRaw[0] ?? null : clientRaw;
  const designer = Array.isArray(designerRaw) ? designerRaw[0] ?? null : designerRaw;

  await upsertByUniqueField(cfg.practicesTable, "crm_practice_id", String(data.id), {
    crm_practice_id: String(data.id),
    reference_code: String(data.reference_code),
    status: String(data.status || ""),
    scheduler_provider: String(data.scheduler_provider || ""),
    quote_amount: Number(data.quote_amount || 0),
    deposit_amount: Number(data.deposit_amount || 0),
    balance_amount: Number(data.balance_amount || 0),
    square_meters: data.square_meters == null ? null : Number(data.square_meters),
    booking_link_url: String(data.booking_link_url || ""),
    booking_link_sent_at: String(data.booking_link_sent_at || ""),
    payment_received_at: String(data.payment_received_at || ""),
    documents_completed_at: String(data.documents_completed_at || ""),
    quote_sent_at: String(data.quote_sent_at || ""),
    quote_accepted_at: String(data.quote_accepted_at || ""),
    followup_count: Number(data.followup_count || 0),
    followup_last_sent_at: String(data.followup_last_sent_at || ""),
    next_followup_at: String(data.next_followup_at || ""),
    followup_last_message: String(data.followup_last_message || ""),
    external_booking_uid: String(data.external_booking_uid || ""),
    external_event_start_at: String(data.external_event_start_at || ""),
    appointment_confirmed_at: String(data.appointment_confirmed_at || ""),
    client_id: client?.id ? String(client.id) : "",
    client_name: client?.full_name ? String(client.full_name) : "",
    client_email: client?.email ? String(client.email) : "",
    designer_id: designer?.id ? String(designer.id) : "",
    designer_name: designer?.full_name ? String(designer.full_name) : "",
    designer_email: designer?.email ? String(designer.email) : "",
    crm_created_at: String(data.created_at || ""),
    crm_updated_at: String(data.updated_at || ""),
    sync_updated_at: new Date().toISOString(),
  });
}

export async function mirrorActivityToAirtable(input: ActivityLogRecord) {
  const cfg = getConfig();
  if (!cfg) return;
  const key = `${input.practice_id}-${input.action_key}-${Date.now()}`;
  await upsertByUniqueField(cfg.activitiesTable, "mirror_event_key", key, {
    mirror_event_key: key,
    practice_id: input.practice_id,
    actor_user_id: input.actor_user_id || "",
    trigger_source: input.trigger_source,
    action_key: input.action_key,
    description: input.description,
    payload_json: JSON.stringify(input.payload || {}),
    created_at: new Date().toISOString(),
  });
}

export async function mirrorPracticeDeletionToAirtable(practiceId: string) {
  const cfg = getConfig();
  if (!cfg) return;
  try {
    const recordId = await findRecordIdByField(cfg.practicesTable, "crm_practice_id", practiceId);
    if (!recordId) return;
    await airtableRequest(`${encodeURIComponent(cfg.practicesTable)}?records[]=${encodeURIComponent(recordId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.warn("⚠️ Airtable mirror delete failed:", error);
  }
}
