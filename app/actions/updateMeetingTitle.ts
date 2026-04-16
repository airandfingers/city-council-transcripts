"use server";

import prisma from "@/app/lib/prisma";

/**
 * Update a meeting's title by its numeric ID.
 * Returns the new title on success.
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
