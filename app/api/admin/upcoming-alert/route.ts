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
  /**
   * False when the scraper found this meeting on the calendar but no
   * agenda has been posted yet (bite/snack/meal are a placeholder
   * mentioning only the scheduled date — see
   * upcoming_summarizer.py::generate_alert_tiers). Defaults to true
   * (today's behavior: a real agenda-backed summary).
   */
  agenda_available: z.boolean().optional(),
});

/**
 * POST /api/admin/upcoming-alert
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "meeting_id": <number>, "bite": "...", "snack": "...", "meal": "...",
 *          "agenda_available"?: boolean }
 *
 * Called by the Python scraper when a new upcoming meeting is found.
 * Creates a MEETING_UPCOMING alert with the bite/snack/meal tiered summary.
 *
 * When `agenda_available` is true (default — a real agenda-backed summary):
 * sends it to admins for visibility and — unlike the post-meeting
 * MEETING_UPDATED path — immediately fans it out to subscribers too
 * (per-subscription frequency: INSTANT sent now, DAILY/WEEKLY/MONTHLY
 * queued for the next digest). This alert type is time-sensitive (per
 * prd.md AC-2.2, must reach subscribers before the meeting) and
 * scraped/agenda-derived rather than AI-summarized meeting content, so it
 * skips the admin-hold-then-manual-publish step the post-meeting alerts use
 * for quality review.
 *
 * When `agenda_available` is false: the meeting is on the calendar but has
 * no agenda/other information yet, so there's nothing worth emailing
 * subscribers about — the alert is left DRAFTED and picked up by the daily
 * admin digest (app/lib/adminDigest.ts) instead of an instant admin email.
 * It never auto-publishes to subscribers (scheduledFor is left null, same
 * as the agenda-backed case) — the scraper re-fires a fresh, real alert
 * through this same endpoint once the agenda is actually posted (see
 * upcoming_scraper.py's noagenda sentinel, kept separate from the permanent
 * "alert already sent" sentinel for exactly this reason).
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

  const { meeting_id, bite, snack, meal, agenda_available = true } = parsed.data;

  try {
    const alert = await createMeetingUpcomingAlert(meeting_id, { bite, snack, meal });

    if (!agenda_available) {
      // No agenda yet — nothing worth emailing subscribers about. Leave
      // DRAFTED for the daily admin digest; never fans out to subscribers.
      return NextResponse.json({ ok: true, alertId: alert.id, agendaAvailable: false });
    }

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
