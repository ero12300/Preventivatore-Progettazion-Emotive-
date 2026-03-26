import { NextRequest, NextResponse } from "next/server";
import {
  listDueFollowupPractices,
  practiceWorkflowRepo,
} from "@/lib/server/practice-repository";
import { runDailyFollowupJob } from "@/lib/server/followup-job";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = req.headers.get("x-cron-secret");
  return bearer === expected || header === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const result = await runDailyFollowupJob({
      ...practiceWorkflowRepo,
      listDueFollowupPractices,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore job follow-up.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
