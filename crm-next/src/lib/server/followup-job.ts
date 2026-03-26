import { executeFollowupReminder, FollowupRepo } from "./followup-flow";
import { PracticeRecord } from "../practice-types";

export type FollowupJobRepo = FollowupRepo & {
  listDueFollowupPractices(nowIso: string): Promise<PracticeRecord[]>;
};

export async function runDailyFollowupJob(repo: FollowupJobRepo) {
  const nowIso = new Date().toISOString();
  const due = await repo.listDueFollowupPractices(nowIso);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const practice of due) {
    try {
      await executeFollowupReminder(repo, practice.id, null);
      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Errore follow-up";
      errors.push(`${practice.reference_code}: ${message}`);
    }
  }

  return {
    scanned: due.length,
    sent,
    failed,
    errors,
    executedAt: nowIso,
  };
}
