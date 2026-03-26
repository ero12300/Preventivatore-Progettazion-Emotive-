import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type DesignerNotificationType =
  | "practice_created"
  | "payment_received"
  | "documentation_complete"
  | "booking_confirmed";

const NOTIFICATION_SUBJECT: Record<DesignerNotificationType, string> = {
  practice_created: "Nuova pratica assegnata - azioni da avviare",
  payment_received: "Pratica aggiornata - pagamento ricevuto",
  documentation_complete: "Pratica pronta - documentazione completa",
  booking_confirmed: "Rilievo prenotato - appuntamento confermato",
};

const NOTIFICATION_TASKS: Record<DesignerNotificationType, string[]> = {
  practice_created: [
    "Analizza i dettagli cliente e imposta le priorita operative.",
    "Prepara checklist interna per avvio progetto.",
    "Allinea eventuali richieste speciali presenti nelle note.",
  ],
  payment_received: [
    "Conferma avvio lavorazione pratica.",
    "Prepara richiesta documentale integrativa se necessaria.",
    "Aggiorna timeline interna di sviluppo.",
  ],
  documentation_complete: [
    "Verifica completezza documentale ricevuta.",
    "Prepara fase di rilievo e materiali tecnici.",
    "Monitora la prenotazione dal link scheduler.",
  ],
  booking_confirmed: [
    "Conferma agenda interna per appuntamento rilievo.",
    "Prepara la lista operativa per il sopralluogo.",
    "Allinea eventuali richieste del cliente prima dell'incontro.",
  ],
};

function buildHtmlBody(input: {
  designerName: string;
  clientName: string;
  clientEmail: string;
  practiceReference: string;
  status: string;
  type: DesignerNotificationType;
}) {
  const tasks = NOTIFICATION_TASKS[input.type]
    .map((task) => `<li style="margin-bottom:8px;">${task}</li>`)
    .join("");
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>Ciao <strong>${input.designerName}</strong>,</p>
      <p>la pratica <strong>${input.practiceReference}</strong> richiede le seguenti azioni operative.</p>
      <ul>${tasks}</ul>
      <p style="margin-top:16px;"><strong>Cliente:</strong> ${input.clientName} (${input.clientEmail})<br/>
      <strong>Stato pratica:</strong> ${input.status}</p>
      <p style="margin-top:20px;">CRM EMOTIVE</p>
    </div>
  `;
}

export async function sendDesignerTaskNotification(
  practiceId: string,
  type: DesignerNotificationType
) {
  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  const from =
    (process.env.DESIGNER_NOTIFICATION_FROM || process.env.GMAIL_FROM || "crm@emotive.local").trim();
  if (!resendApiKey) return;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("practices")
    .select(
      "reference_code,status,clients(full_name,email),project_designers(full_name,email)"
    )
    .eq("id", practiceId)
    .maybeSingle();
  if (error || !data) return;

  const clientRaw = data.clients as Record<string, unknown> | Record<string, unknown>[] | null;
  const designerRaw =
    data.project_designers as Record<string, unknown> | Record<string, unknown>[] | null;
  const client = Array.isArray(clientRaw) ? clientRaw[0] ?? null : clientRaw;
  const designer = Array.isArray(designerRaw) ? designerRaw[0] ?? null : designerRaw;
  const designerEmail = typeof designer?.email === "string" ? designer.email : "";
  if (!designerEmail) return;

  const designerName =
    typeof designer?.full_name === "string" && designer.full_name.trim()
      ? designer.full_name
      : "Progettista";
  const clientName =
    typeof client?.full_name === "string" && client.full_name.trim() ? client.full_name : "Cliente";
  const clientEmail = typeof client?.email === "string" ? client.email : "n/d";
  const reference = typeof data.reference_code === "string" ? data.reference_code : practiceId;
  const status = typeof data.status === "string" ? data.status : "n/d";

  const payload = {
    from,
    to: [designerEmail],
    subject: `${NOTIFICATION_SUBJECT[type]} - ${reference}`,
    html: buildHtmlBody({
      designerName,
      clientName,
      clientEmail,
      practiceReference: reference,
      status,
      type,
    }),
  };

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non bloccare il flusso CRM se la notifica email fallisce.
  }
}
