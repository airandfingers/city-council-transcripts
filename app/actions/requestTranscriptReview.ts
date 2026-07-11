"use server";

import prisma from "@/app/lib/prisma";
import { sendTranscriptReviewRequestEmail, buildMeetingUrl } from "@/app/lib/email";

/**
 * A visitor asks for a human to double-check an AI-generated transcript's
 * accuracy. Emails admin subscribers (same isAdmin-flagged list used for
 * city-coverage requests, see app/actions/subscribe.ts) — this doesn't
 * change any review-status field itself; a human still has to actually do
 * the review and update it via the transcriber's existing review_status.json
 * mechanism (see Meeting.transcriptReviewed).
 */
export async function requestTranscriptReview(
  meetingId: number,
  note?: string,
): Promise<{ sent: boolean }> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, slug: true },
  });
  if (!meeting) throw new Error("Meeting not found");

  const adminSubscribers = await prisma.subscriber.findMany({
    where: { isAdmin: true },
    select: { email: true },
  });

  await sendTranscriptReviewRequestEmail({
    meetingTitle: meeting.title,
    meetingUrl: buildMeetingUrl(meeting.slug),
    requesterNote: note?.trim() || undefined,
    adminEmails: adminSubscribers.map((s) => s.email),
  });

  return { sent: adminSubscribers.length > 0 };
}
