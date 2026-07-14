import { NextResponse } from "next/server";
import { isAuthorized, PublishBody } from "@/app/lib/publish";
import { createMeetingUpdateAlert } from "@/app/lib/alerts";

/**
 * POST /api/publish-to-admins
 *
 * Body: { "meeting_id": <number> }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Stage 1 of the alert pipeline (see app/lib/alerts.ts): drafts an Alert
 * for the meeting. Admins are notified via the once-daily admin digest
 * (app/lib/adminDigest.ts::sendDueAdminDigest, /api/cron/admin-digest)
 * rather than an instant per-meeting email — this alert type always waits
 * for the subscriber hold window anyway, so there's no urgency to notify
 * admins immediately. The admin's manual "send to subscribers" trigger
 * (stage 2) happens later via publishAlertToSubscribers(), e.g. from the
 * /admin/alerts page.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PublishBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "meeting_id (positive integer) is required" },
      { status: 400 },
    );
  }

  let alert;
  try {
    alert = await createMeetingUpdateAlert(parsed.data.meeting_id);
  } catch {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    alertId: alert.id,
    meetingId: parsed.data.meeting_id,
  });
}
