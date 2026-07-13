import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createInterestAreaAlert,
  publishAlertToSubscribers,
  sendAlertToAdmins,
} from "@/app/lib/alerts";
import { isAuthorized } from "@/app/lib/publish";

const InterestAreaAlertBody = z.object({
  interest_area_id: z.number().int().positive(),
  // Present for a pre-meeting PREVIEW-phase signal (see
  // interest_area_summarizer.py::preview_meeting_for_interest_areas in
  // city-council-transcriber); absent for the existing post-meeting path.
  meeting_id: z.number().int().positive().optional(),
  phase: z.enum(["preview", "postmeeting"]).optional(),
  summary: z.string().optional(),
  discussion_expected: z.boolean().optional(),
  signal_strength: z.string().optional(),
});

/**
 * POST /api/admin/interest-area-alert
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "interest_area_id": <number>, "meeting_id"?, "phase"?, "summary"?,
 *          "discussion_expected"?, "signal_strength"? }
 *
 * Called by the Python interest-area feed consumer when a notify-worthy
 * event is detected for an interest area. Without `meeting_id`/`phase`,
 * creates an INTEREST_AREA_UPDATED alert from the area's current
 * statusSummary (post-meeting rollup) as before. When `phase` is "preview"
 * (a pre-meeting agenda-only signal), the alert is meeting-specific instead
 * — content built from `summary`/`discussion_expected`/`signal_strength`,
 * with `meetingId` set so the resulting email links to that meeting's page.
 * Either way, sends the draft to admins for visibility. PREVIEW-phase
 * alerts additionally fan out to subscribers immediately (per-subscription
 * frequency: INSTANT sent now, DAILY/WEEKLY/MONTHLY queued for the next
 * digest) since they're time-sensitive pre-meeting signals, not AI-generated
 * meeting content awaiting quality review — the existing post-meeting
 * rollup path is unchanged (admin-hold + scheduled drain).
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

  const parsed = InterestAreaAlertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "interest_area_id (positive integer) is required" },
      { status: 400 },
    );
  }

  const { interest_area_id, meeting_id, phase, summary, discussion_expected, signal_strength } =
    parsed.data;

  const isPreview = phase === "preview" && meeting_id != null;

  try {
    const alert = await createInterestAreaAlert(
      interest_area_id,
      isPreview
        ? {
            meetingId: meeting_id!,
            summary,
            discussionExpected: discussion_expected,
            signalStrength: signal_strength,
          }
        : undefined,
    );
    const adminResult = await sendAlertToAdmins(alert.id);

    if (isPreview) {
      const subscriberResult = await publishAlertToSubscribers(
        alert.id,
        "api:interest-area-alert",
      );
      return NextResponse.json({
        ok: true,
        alertId: alert.id,
        admins: adminResult,
        subscribers: subscriberResult,
      });
    }

    return NextResponse.json({
      ok: true,
      alertId: alert.id,
      ...adminResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
