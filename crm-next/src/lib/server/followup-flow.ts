import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { ActivityLogRecord, PracticeRecord } from "@/lib/practice-types";

export type FollowupMessage = {
  stage: number;
  subject: string;
  body: string;
  cta: string;
};

export type FollowupRepo = {
  getPracticeById(id: string): Promise<PracticeRecord | null>;
  updatePractice(id: string, patch: Partial<PracticeRecord>): Promise<PracticeRecord>;
  insertActivity(input: ActivityLogRecord): Promise<void>;
};

function buildFollowupMessage(practice: PracticeRecord): FollowupMessage {
  const stage = Math.min((practice.followup_count || 0) + 1, 3);
  const ref = practice.reference_code;

  if (stage === 1) {
    return {
      stage,
      subject: `Riepilogo proposta ${ref} - restiamo allineati`,
      body:
        "Ti scrivo per assicurarmi che il preventivo sia chiaro in ogni punto. " +
        "Se vuoi, possiamo rivedere insieme priorita, tempi e impatto operativo cosi da scegliere con piena sicurezza.",
      cta: "Rispondi a questa email con 'OK' e ti propongo 2 slot veloci di confronto.",
    };
  }

  if (stage === 2) {
    return {
      stage,
      subject: `Opportunita operativa su ${ref} - decidiamo il prossimo passo`,
      body:
        "Quando il progetto parte nei tempi giusti, riduce revisioni e costi nascosti. " +
        "Possiamo bloccare ora la fase successiva e mantenere controllo su budget e calendario.",
      cta: "Conferma 'procediamo' e ti inviamo il piano esecutivo del prossimo step.",
    };
  }

  return {
    stage,
    subject: `Ultimo promemoria ${ref} - chiudiamo con una decisione`,
    body:
      "Ti invio un ultimo promemoria per aiutarti a chiudere questa decisione in modo semplice. " +
      "Se hai dubbi, li risolviamo subito; se vuoi fermare il progetto, lo registriamo e liberiamo la pianificazione.",
    cta: "Rispondi con 'chiudiamo' oppure 'pausa' entro 48 ore.",
  };
}

function computeNextFollowupDate(from: Date, stageSent: number): Date {
  if (stageSent === 1) return addDays(from, 3);
  if (stageSent === 2) return addDays(from, 4);
  return addDays(from, 7);
}

export async function executeFollowupReminder(
  repo: FollowupRepo,
  practiceId: string,
  actorUserId: string | null = null
) {
  const practice = await repo.getPracticeById(practiceId);
  if (!practice) throw new Error("Pratica non trovata.");
  if (practice.status !== "preventivo_inviato") {
    throw new Error("Follow-up consentito solo su pratiche con stato preventivo_inviato.");
  }
  if (practice.quote_accepted_at) {
    throw new Error("Preventivo gia accettato: follow-up non necessario.");
  }

  const now = new Date();
  const message = buildFollowupMessage(practice);
  const nextDate = computeNextFollowupDate(now, message.stage);
  const nextIso = nextDate.toISOString();

  const updated = await repo.updatePractice(practiceId, {
    followup_count: (practice.followup_count || 0) + 1,
    followup_last_sent_at: now.toISOString(),
    followup_last_message: `${message.subject}\n\n${message.body}\n\n${message.cta}`,
    next_followup_at: nextIso,
    metadata: {
      ...(practice.metadata || {}),
      followup_last_stage: message.stage,
      followup_next_date_human: format(nextDate, "dd MMM yyyy", { locale: it }),
    },
  });

  await repo.insertActivity({
    practice_id: practiceId,
    actor_user_id: actorUserId,
    trigger_source: "admin_flag",
    action_key: "followup_inviato",
    description: `Follow-up commerciale inviato (stage ${message.stage}).`,
    payload: {
      stage: message.stage,
      subject: message.subject,
      next_followup_at: nextIso,
    },
  });

  return {
    practice: updated,
    message,
    nextFollowupAt: nextIso,
  };
}
