"use server";

import prisma from "@/app/lib/prisma";

/**
 * Update a meeting's title by its numeric ID.
 * Returns the new title on success.
 *
 * Note: this intentionally does NOT regenerate `meeting.slug` from the
 * new title. The slug is the meeting's stable public identity (its URL,
 * `/transcripts/{slug}`) and is built once at creation time via
 * `buildMeetingSlug()` (see app/lib/meetingSlug.ts and
 * scripts/import-transcription-export.mjs). Regenerating it on every
 * title edit would break bookmarks, shared links, and any future
 * subscription/alert links that reference a meeting by slug. Title and
 * slug are deliberately decoupled: title is freely editable display
 * text, slug is permanent.
 */
export async function updateMeetingTitle(
  meetingId: number,
  newTitle: string,
): Promise<{ title: string }> {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    throw new Error("Title cannot be empty");
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { title: trimmed },
  });

  return { title: updated.title };
}
