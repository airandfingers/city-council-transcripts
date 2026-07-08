import { NextResponse } from "next/server";
import { publishDueScheduledAlerts } from "@/app/lib/alerts";

/**
 * GET /api/cron/publish-scheduled
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Scheduled drain (Vercel Cron): publishes every alert whose hold window has
 * elapsed (`scheduledFor <= now`, still DRAFTED/SENT_TO_ADMINS) to its
 * end-user subscribers, reusing the stage-2 pipeline
 * (publishAlertToSubscribers). Frequency-agnostic — it releases everything
 * currently due, so the cron cadence is just a knob. Vercel Cron issues GET
 * and injects the bearer token automatically when CRON_SECRET is configured.
 */
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === expected;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueScheduledAlerts();
  return NextResponse.json({ ok: true, ...result });
}
