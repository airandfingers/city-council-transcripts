import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import {
  sendInterestAreaEmail,
  sendMeetingPublishedEmail,
  sendUpcomingMeetingEmail,
  buildMeetingUrl,
} from "@/app/lib/email";
import {
  InterestAreaUpdatedContent,
  MeetingUpdatedContent,
  MeetingUpcomingContent,
} from "@/app/lib/alerts";
import { isAuthorized } from "@/app/lib/publish";

const PreviewBody = z.object({
  alert_id: z.number().int().positive(),
  /** Send the preview to this email address instead of subscribers. */
  send_to: z.string().email(),
});

/**
 * POST /api/admin/preview
 *
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 * Body: { "alert_id": <number>, "send_to": "<email>" }
 *
 * Renders and sends one test email for a given alert to a single address,
 * without touching alert status or subscriber lists. Used by the Flask
 * operator dashboard's "Send test to me" button.
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

  const parsed = PreviewBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "alert_id and send_to (email) are required" },
      { status: 400 },
    );
  }

  const { alert_id, send_to } = parsed.data;

  const alert = await prisma.alert.findUnique({
    where: { id: alert_id },
    include: {
      meeting: { select: { slug: true, date: true, city: { select: { name: true } } } },
      interestArea: { select: { city: { select: { name: true } } } },
    },
  });

  if (!alert) {
    return NextResponse.json({ error: `Alert ${alert_id} not found` }, { status: 404 });
  }

  try {
    switch (alert.type) {
      case "MEETING_UPDATED": {
        if (!alert.meeting) throw new Error("Alert missing meeting");
        const content = alert.content as MeetingUpdatedContent;
        await sendMeetingPublishedEmail({
          to: send_to,
          meetingTitle: content.subject,
          cityName: alert.meeting.city.name,
          tldr: content.tldr,
          keyDecisions: content.keyDecisions,
          meetingUrl: buildMeetingUrl(alert.meeting.slug),
          isAdmin: true,
        });
        break;
      }
      case "MEETING_UPCOMING": {
        if (!alert.meeting) throw new Error("Alert missing meeting");
        const content = alert.content as MeetingUpcomingContent;
        await sendUpcomingMeetingEmail({
          to: send_to,
          meetingTitle: content.subject,
          cityName: alert.meeting.city.name,
          meetingDate: alert.meeting.date,
          bite: content.bite,
          snack: content.snack,
          meal: content.meal,
          meetingUrl: buildMeetingUrl(alert.meeting.slug),
          isAdmin: true,
        });
        break;
      }
      case "INTEREST_AREA_UPDATED": {
        if (!alert.interestArea) throw new Error("Alert missing interestArea");
        const content = alert.content as InterestAreaUpdatedContent;
        await sendInterestAreaEmail({
          to: send_to,
          areaName: content.subject,
          cityName: alert.interestArea.city.name,
          tldr: content.tldr,
          highlights: content.highlights,
          areaUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
          isAdmin: true,
        });
        break;
      }
    }

    return NextResponse.json({ ok: true, alertId: alert_id, sentTo: send_to });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
