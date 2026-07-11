"use server";

import prisma from "@/app/lib/prisma";

/**
 * Toggle whether a meeting's summary/content has been reviewed.
 *
 * Independent of `Meeting.transcriptReviewed` (sourced from the
 * transcriber's own review_status.json) — this flag has no pipeline
 * source of truth and is only ever set here.
 *
 * No auth gate: matches this repo's existing precedent for meeting-level
 * edits made directly from the public page (see updateMeetingTitle.ts).
 * If you want this restricted to a real admin session later, that's a
 * separate auth-model addition, not something specific to this flag.
 */
export async function markMeetingReviewed(
  meetingId: number,
  reviewed: boolean,
  reviewedBy: string = "admin",
): Promise<{ meetingReviewed: boolean }> {
  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      meetingReviewed: reviewed,
      meetingReviewedAt: reviewed ? new Date() : null,
      meetingReviewedBy: reviewed ? reviewedBy : null,
    },
  });

  return { meetingReviewed: updated.meetingReviewed ?? false };
}
