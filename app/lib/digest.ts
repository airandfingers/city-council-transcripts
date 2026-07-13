import prisma from "@/app/lib/prisma";
import type { AlertFrequency } from "@prisma/client";
import { buildManageUrl, buildMeetingUrl, sendDigestEmail } from "@/app/lib/email";
import type { DigestGroup } from "@/emails/DigestEmail";
import type {
  InterestAreaUpdatedContent,
  MeetingUpcomingContent,
  MeetingUpdatedContent,
} from "@/app/lib/alerts";

/**
 * Bundles every PENDING AlertDelivery for a given frequency into one digest
 * email per subscriber, grouped by city/topic (see app/lib/alerts.ts's
 * publishAlertToSubscribers for how deliveries get queued as PENDING).
 * Called by the three per-frequency cron routes
 * (app/api/cron/digest-{daily,weekly,monthly}).
 *
 * @module digest
 */

const FREQUENCY_LABEL: Record<AlertFrequency, string> = {
  INSTANT: "Instant",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export type DigestRunResult = {
  frequency: AlertFrequency;
  subscribersEmailed: number;
  deliveriesSent: number;
  deliveriesSkipped: number;
  failed: { subscriberId: number; error: string }[];
};

/**
 * Sends every subscriber their bundled digest for the given frequency and
 * marks the included AlertDeliveries SENT (with a shared DigestBatch). Never
 * called for INSTANT — those are sent immediately at publish time instead
 * (see publishAlertToSubscribers).
 */
export async function sendDueDigests(
  frequency: AlertFrequency,
  now: Date = new Date(),
): Promise<DigestRunResult> {
  const pending = await prisma.alertDelivery.findMany({
    where: { frequency, status: "PENDING" },
    select: {
      id: true,
      alert: {
        select: {
          id: true,
          type: true,
          content: true,
          meetingId: true,
          interestAreaId: true,
        },
      },
      subscription: {
        select: {
          subscriberId: true,
          unsubscribeToken: true,
          subscriber: { select: { email: true } },
        },
      },
    },
  });

  if (pending.length === 0) {
    return {
      frequency,
      subscribersEmailed: 0,
      deliveriesSent: 0,
      deliveriesSkipped: 0,
      failed: [],
    };
  }

  // Cache meeting/interest-area lookups across deliveries in this run.
  const meetingCache = new Map<number, { slug: string; date: Date; cityName: string } | null>();
  async function getMeeting(meetingId: number) {
    if (!meetingCache.has(meetingId)) {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: { slug: true, date: true, city: { select: { name: true } } },
      });
      meetingCache.set(
        meetingId,
        meeting ? { slug: meeting.slug, date: meeting.date, cityName: meeting.city.name } : null,
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

  // Skip (never silently send stale "upcoming" news) any pending delivery
  // whose underlying meeting date has already passed.
  const toSkip: number[] = [];
  type Resolved = {
    deliveryId: number;
    subscriberId: number;
    email: string;
    manageUrl: string;
    groupKey: string;
    groupHeading: string;
    item: { title: string; summary: string | null; url: string };
  };
  const resolved: Resolved[] = [];

  for (const d of pending) {
    const isUpcomingFlavor =
      d.alert.type === "MEETING_UPCOMING" ||
      (d.alert.type === "INTEREST_AREA_UPDATED" &&
        (d.alert.content as InterestAreaUpdatedContent)?.phase === "preview");

    if (isUpcomingFlavor && d.alert.meetingId) {
      const meeting = await getMeeting(d.alert.meetingId);
      if (!meeting || meeting.date.getTime() < now.getTime()) {
        toSkip.push(d.id);
        continue;
      }
    }

    const manageUrl = buildManageUrl(d.subscription.unsubscribeToken);
    const base = {
      deliveryId: d.id,
      subscriberId: d.subscription.subscriberId,
      email: d.subscription.subscriber.email,
      manageUrl,
    };

    switch (d.alert.type) {
      case "MEETING_UPDATED": {
        if (!d.alert.meetingId) {
          toSkip.push(d.id);
          continue;
        }
        const meeting = await getMeeting(d.alert.meetingId);
        if (!meeting) {
          toSkip.push(d.id);
          continue;
        }
        const content = d.alert.content as MeetingUpdatedContent;
        resolved.push({
          ...base,
          groupKey: `city:${meeting.cityName}`,
          groupHeading: meeting.cityName,
          item: {
            title: content.subject,
            summary: content.tldr,
            url: buildMeetingUrl(meeting.slug),
          },
        });
        break;
      }
      case "MEETING_UPCOMING": {
        if (!d.alert.meetingId) {
          toSkip.push(d.id);
          continue;
        }
        const meeting = await getMeeting(d.alert.meetingId);
        if (!meeting) {
          toSkip.push(d.id);
          continue;
        }
        const content = d.alert.content as MeetingUpcomingContent;
        resolved.push({
          ...base,
          groupKey: `city:${meeting.cityName}`,
          groupHeading: meeting.cityName,
          item: {
            title: `Upcoming: ${content.subject}`,
            summary: content.snack,
            url: buildMeetingUrl(meeting.slug),
          },
        });
        break;
      }
      case "INTEREST_AREA_UPDATED": {
        if (!d.alert.interestAreaId) {
          toSkip.push(d.id);
          continue;
        }
        const area = await getArea(d.alert.interestAreaId);
        if (!area) {
          toSkip.push(d.id);
          continue;
        }
        const content = d.alert.content as InterestAreaUpdatedContent;
        const meeting = d.alert.meetingId ? await getMeeting(d.alert.meetingId) : null;
        resolved.push({
          ...base,
          groupKey: `topic:${area.name}:${area.cityName}`,
          groupHeading: `${area.name} · ${area.cityName}`,
          item: {
            title:
              content.phase === "preview"
                ? `${content.subject} — expected at an upcoming meeting`
                : content.subject,
            summary: content.tldr,
            url: meeting ? buildMeetingUrl(meeting.slug) : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}`,
          },
        });
        break;
      }
    }
  }

  if (toSkip.length > 0) {
    await prisma.alertDelivery.updateMany({
      where: { id: { in: toSkip } },
      data: { status: "SKIPPED" },
    });
  }

  const bySubscriber = new Map<number, Resolved[]>();
  for (const r of resolved) {
    if (!bySubscriber.has(r.subscriberId)) bySubscriber.set(r.subscriberId, []);
    bySubscriber.get(r.subscriberId)!.push(r);
  }

  let subscribersEmailed = 0;
  let deliveriesSent = 0;
  const failed: DigestRunResult["failed"] = [];

  for (const [subscriberId, items] of bySubscriber) {
    try {
      const groupsByKey = new Map<string, DigestGroup>();
      for (const item of items) {
        if (!groupsByKey.has(item.groupKey)) {
          groupsByKey.set(item.groupKey, { heading: item.groupHeading, items: [] });
        }
        groupsByKey.get(item.groupKey)!.items.push(item.item);
      }

      await sendDigestEmail({
        to: items[0].email,
        frequencyLabel: FREQUENCY_LABEL[frequency],
        groups: Array.from(groupsByKey.values()),
        manageUrl: items[0].manageUrl,
      });

      const batch = await prisma.digestBatch.create({
        data: { subscriberId, frequency },
      });
      await prisma.alertDelivery.updateMany({
        where: { id: { in: items.map((i) => i.deliveryId) } },
        data: { status: "SENT", sentAt: now, digestBatchId: batch.id },
      });

      subscribersEmailed += 1;
      deliveriesSent += items.length;
    } catch (err) {
      console.error(`Failed to send ${frequency} digest to subscriber ${subscriberId}`, err);
      failed.push({
        subscriberId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    frequency,
    subscribersEmailed,
    deliveriesSent,
    deliveriesSkipped: toSkip.length,
    failed,
  };
}
