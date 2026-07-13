import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMeetingUpcomingAlert,
  publishAlertToSubscribers,
  sendAlertToAdmins,
} from "@/app/lib/alerts";
import { isAuthorized } from "@/app/lib/publish";

const UpcomingAlertBody = z.object({
  meeting_id: z.number().int().positive(),
  /** One-line teaser — the quickest possible read. */
  bite: z.string().min(1),
  /** Short paragraph for a casual reader. */
  snack: z.string().min(1),
  /** Fuller narrative for someone who wants the full picture. */
  meal: z.string().min(1),
});

/**
 * POST /api/admin/upcoming-alert
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "meeting_id": <number>, "bite": "...", "snack": "...", "meal": "..." }
 *
 * Called by the Python scraper when a new upcoming meeting's agenda is
 * available. Creates a MEETING_UPCOMING alert with the bite/snack/meal
 * tiered summary, sends it to admins for visibility, and — unlike the
 * post-meeting MEETING_UPDATED path — immediately fans it out to
 * subscribers too (per-subscription frequency: INSTANT sent now,
 * DAILY/WEEKLY/MONTHLY queued for the next digest). This alert type is
 * time-sensitive (per prd.md AC-2.2, must reach subscribers before the
 * meeting) and scraped/agenda-derived rather than AI-summarized meeting
 * content, so it skips the admin-hold-then-manual-publish step the
 * post-meeting alerts use for quality review.
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

  const parsed = UpcomingAlertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "meeting_id, bite, snack, and meal are required" },
      { status: 400 },
    );
  }

  const { meeting_id, bite, snack, meal } = parsed.data;

  try {
    const alert = await createMeetingUpcomingAlert(meeting_id, { bite, snack, meal });
    const adminResult = await sendAlertToAdmins(alert.id);
    const subscriberResult = await publishAlertToSubscribers(alert.id, "api:upcoming-alert");
    return NextResponse.json({
      ok: true,
      alertId: alert.id,
      admins: adminResult,
      subscribers: subscriberResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
