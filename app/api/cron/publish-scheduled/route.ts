import { NextResponse } from "next/server";
import { publishDueScheduledAlerts } from "@/app/lib/alerts";
import { isCronAuthorized } from "@/app/lib/cronAuth";

/**
 * GET /api/cron/publish-scheduled
 *
 * Auth: Authorization: Bearer <CRON_SECRET | a CronAuthToken.token row>
 *
 * Scheduled drain (Vercel Cron): publishes every alert whose hold window has
 * elapsed (`scheduledFor <= now`, still SENT_TO_ADMINS) to its end-user
 * subscribers, reusing the stage-2 pipeline (publishAlertToSubscribers).
 * This only decides *when an alert is released*; per-subscriber delivery
 * still respects frequency — INSTANT subscriptions are emailed as part of
 * that release, while DAILY/WEEKLY/MONTHLY subscriptions are queued as
 * PENDING AlertDeliveries for the digest-* crons to bundle later. Vercel
 * Cron issues GET and injects the bearer token automatically when
 * CRON_SECRET is configured on the Vercel project.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueScheduledAlerts();
  return NextResponse.json({ ok: true, ...result });
}
