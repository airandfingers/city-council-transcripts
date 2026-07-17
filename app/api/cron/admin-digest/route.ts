import { NextResponse } from "next/server";
import { sendDueAdminDigest } from "@/app/lib/adminDigest";
import { isCronAuthorized } from "@/app/lib/cronAuth";

/**
 * GET /api/cron/admin-digest
 *
 * Auth: Authorization: Bearer <CRON_SECRET | a CronAuthToken.token row>
 *
 * Bundles every DRAFTED alert not yet emailed to admins
 * (Alert.sentToAdminsAt is null) into one digest email per admin (see
 * app/lib/adminDigest.ts::sendDueAdminDigest), then marks those alerts
 * SENT_TO_ADMINS so publish-scheduled can still release them to
 * subscribers on the normal hold window. Scheduled to run before
 * publish-scheduled so admins are never notified after subscribers.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueAdminDigest();
  return NextResponse.json({ ok: true, ...result });
}
