import { NextResponse } from "next/server";
import { isAuthorized, PublishBody } from "@/app/lib/publish";
import { createMeetingUpdateAlert, publishAlertToSubscribers } from "@/app/lib/alerts";

/**
 * POST /api/publish
 *
 * Body: { "meeting_id": <number> }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Notifies active subscribers to the meeting's city (CITY_UPDATES) that a
 * meeting has been added, with a TL;DR, Key Decisions, and a link to the
 * Counciloris page. Unlike /api/publish-to-admins, this goes straight to
 * subscribers rather than holding for admin review first — it creates the
 * same MEETING_UPDATED alert and immediately calls publishAlertToSubscribers,
 * which fans out per-subscription: INSTANT recipients are emailed now,
 * DAILY/WEEKLY/MONTHLY recipients get a queued AlertDelivery picked up by
 * their next digest run.
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

  const result = await publishAlertToSubscribers(alert.id, "api:publish");

  return NextResponse.json({
    ok: true,
    alertId: alert.id,
    meetingId: parsed.data.meeting_id,
    ...result,
  });
}
