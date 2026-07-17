import prisma from "@/app/lib/prisma";
import { buildMeetingUrl, sendDigestEmail } from "@/app/lib/email";
import type { DigestGroup } from "@/emails/DigestEmail";
import { getAdminRecipients } from "@/app/lib/publish";
import type {
  InterestAreaUpdatedContent,
  MeetingUpcomingContent,
  MeetingUpdatedContent,
} from "@/app/lib/alerts";

/**
 * Bundles every admin-review alert that hasn't been emailed to admins yet
 * (`Alert.sentToAdminsAt` is null — the same ledger `sendAlertToAdmins` sets)
 * into a single daily digest email per admin, then marks each alert
 * `SENT_TO_ADMINS` so the existing subscriber drain
 * (`publishDueScheduledAlerts`) can still release the ones with a
 * `scheduledFor` on their normal hold window.
 *
 * Only covers alerts that were *not* instantly fanned out to admins at
 * creation time — the preview/instant paths (interest-area preview,
 * upcoming-with-agenda) call `sendAlertToAdmins` inline and are excluded via
 * the `sentToAdminsAt` filter. Called by the `/api/cron/admin-digest` route,
 * scheduled to run before `publish-scheduled` so admins are never notified
 * after subscribers.
 *
 * @module adminDigest
 */

export type AdminDigestResult = {
  adminsEmailed: number;
  alertsBundled: number;
  failed: { email: string; error: string }[];
};

export async function sendDueAdminDigest(now: Date = new Date()): Promise<AdminDigestResult> {
  const pending = await prisma.alert.findMany({
    where: { status: "DRAFTED", sentToAdminsAt: null },
    select: {
      id: true,
      type: true,
      content: true,
      meetingId: true,
      interestAreaId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    return { adminsEmailed: 0, alertsBundled: 0, failed: [] };
  }

  const meetingCache = new Map<number, { slug: string; cityName: string } | null>();
  async function getMeeting(meetingId: number) {
    if (!meetingCache.has(meetingId)) {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: { slug: true, city: { select: { name: true } } },
      });
      meetingCache.set(
        meetingId,
        meeting ? { slug: meeting.slug, cityName: meeting.city.name } : null,
      );
    }
    return meetingCache.get(meetingId) ?? null;
  }

  const areaCache = new Map<number, { name: string; cityName: string } | null>();
  async function getArea(interestAreaId: number) {
    if (!areaCache.has(interestAreaId)) {
      const area = await prisma.interestArea.findUnique({
        where: { id: interestAreaId },
        select: { name: true, city: { select: { name: true } } },
      });
      areaCache.set(interestAreaId, area ? { name: area.name, cityName: area.city.name } : null);
    }
    return areaCache.get(interestAreaId) ?? null;
  }

  type Item = { groupKey: string; groupHeading: string; title: string; summary: string | null; url: string };
  const items: Item[] = [];
  const bundledAlertIds: number[] = [];

  for (const alert of pending) {
    switch (alert.type) {
      case "MEETING_UPDATED": {
        if (!alert.meetingId) continue;
        const meeting = await getMeeting(alert.meetingId);
        if (!meeting) continue;
        const content = alert.content as MeetingUpdatedContent;
        items.push({
          groupKey: `city:${meeting.cityName}`,
          groupHeading: meeting.cityName,
          title: content.subject,
          summary: content.tldr,
          url: buildMeetingUrl(meeting.slug),
        });
        bundledAlertIds.push(alert.id);
        break;
      }
      case "MEETING_UPCOMING": {
        if (!alert.meetingId) continue;
        const meeting = await getMeeting(alert.meetingId);
        if (!meeting) continue;
        const content = alert.content as MeetingUpcomingContent;
        items.push({
          groupKey: `city:${meeting.cityName}`,
          groupHeading: meeting.cityName,
          title: `Upcoming (no agenda yet): ${content.subject}`,
          summary: content.snack,
          url: buildMeetingUrl(meeting.slug),
        });
        bundledAlertIds.push(alert.id);
        break;
      }
      case "INTEREST_AREA_UPDATED": {
        if (!alert.interestAreaId) continue;
        const area = await getArea(alert.interestAreaId);
        if (!area) continue;
        const content = alert.content as InterestAreaUpdatedContent;
        const meeting = alert.meetingId ? await getMeeting(alert.meetingId) : null;
        items.push({
          groupKey: `topic:${area.name}:${area.cityName}`,
          groupHeading: `${area.name} · ${area.cityName}`,
          title: content.subject,
          summary: content.tldr,
          url: meeting ? buildMeetingUrl(meeting.slug) : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}`,
        });
        bundledAlertIds.push(alert.id);
        break;
      }
    }
  }

  if (bundledAlertIds.length === 0) {
    return { adminsEmailed: 0, alertsBundled: 0, failed: [] };
  }

  const groupsByKey = new Map<string, DigestGroup>();
  for (const item of items) {
    if (!groupsByKey.has(item.groupKey)) {
      groupsByKey.set(item.groupKey, { heading: item.groupHeading, items: [] });
    }
    groupsByKey.get(item.groupKey)!.items.push({
      title: item.title,
      summary: item.summary,
      url: item.url,
    });
  }
  const groups = Array.from(groupsByKey.values());

  const admins = await getAdminRecipients();
  const failed: AdminDigestResult["failed"] = [];
  let adminsEmailed = 0;

  for (const admin of admins) {
    try {
      await sendDigestEmail({
        to: admin.email,
        frequencyLabel: "Daily admin",
        groups,
      });
      adminsEmailed += 1;
    } catch (err) {
      console.error(`Failed to send admin digest to ${admin.email}`, err);
      failed.push({ email: admin.email, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Mark bundled alerts as sent-to-admins regardless of per-admin send
  // failures — the content is the same "reviewed" snapshot either way, and
  // this is what unblocks the scheduled subscriber drain.
  await prisma.alert.updateMany({
    where: { id: { in: bundledAlertIds } },
    data: { status: "SENT_TO_ADMINS", sentToAdminsAt: now },
  });

  return { adminsEmailed, alertsBundled: bundledAlertIds.length, failed };
}
