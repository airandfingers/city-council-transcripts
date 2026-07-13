import { z } from "zod";
import prisma from "@/app/lib/prisma";
import type { AlertFrequency } from "@prisma/client";

/**
 * Shared logic for the publish endpoints (`/api/publish` and
 * `/api/publish-to-admins`): loads the meeting content used in the
 * notification email and resolves the set of recipients.
 *
 * @module publish
 */

/** Everything the published-meeting email needs to render. */
export type PublishMeeting = {
  id: number;
  title: string;
  slug: string;
  cityId: number;
  cityName: string;
  /** TL;DR paragraph (the meeting logline), or null if not generated yet. */
  tldr: string | null;
  /** Key-decision bullets, ordered as shown on the site. */
  keyDecisions: string[];
  /** When the meeting took place; used to age-gate end-user alerts. */
  date: Date;
};

/** A subscriber to notify, with an optional manage/unsubscribe link. */
export type PublishRecipient = {
  email: string;
  /** Token backing the manage/unsubscribe link; null for admins with none. */
  unsubscribeToken: string | null;
};

/**
 * A subscription-backed recipient: same as PublishRecipient, plus the
 * subscription id and frequency the fan-out layer (app/lib/alerts.ts) needs
 * to create an AlertDelivery and decide whether to send immediately (INSTANT)
 * or queue for the next digest (DAILY/WEEKLY/MONTHLY).
 */
export type SubscriptionRecipient = PublishRecipient & {
  subscriptionId: number;
  frequency: AlertFrequency;
};

/** Strips the trailing "[minutes]" marker the site also hides from bullets. */
function cleanBullet(text: string): string {
  return text.replace(/\s*\[minutes\]\s*$/i, "").trim();
}

/**
 * Loads a meeting and the content shown in the notification email, or
 * null if no meeting with that id exists.
 */
export async function getPublishMeeting(
  meetingId: number,
): Promise<PublishMeeting | null> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      title: true,
      slug: true,
      cityId: true,
      logline: true,
      date: true,
      city: { select: { name: true } },
      summaryItems: {
        where: { type: "KEY_DECISION" },
        orderBy: { sortOrder: "asc" },
        select: { text: true },
      },
    },
  });

  if (!meeting) return null;

  return {
    id: meeting.id,
    title: meeting.title,
    slug: meeting.slug,
    cityId: meeting.cityId,
    cityName: meeting.city.name,
    tldr: meeting.logline,
    keyDecisions: meeting.summaryItems.map((item) => cleanBullet(item.text)),
    date: meeting.date,
  };
}

/**
 * Max age, in days, of a meeting for which end-user (non-admin) alert
 * emails will still be sent. Configurable via MAX_USER_ALERT_MEETING_AGE_DAYS;
 * defaults to 30 (~1 month). Invalid or missing values fall back to the
 * default. Admin review emails are never age-gated — this only guards the
 * subscriber-facing sends.
 */
export function getMaxUserAlertMeetingAgeDays(): number {
  const raw = process.env.MAX_USER_ALERT_MEETING_AGE_DAYS;
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/** True when a meeting is too old to still email end-user subscribers about. */
export function isMeetingTooOldForUserAlerts(
  meetingDate: Date,
  now: Date = new Date(),
): boolean {
  const ageMs = now.getTime() - meetingDate.getTime();
  return ageMs > getMaxUserAlertMeetingAgeDays() * 24 * 3_600_000;
}

/** Admin subscribers, who receive the (ADMIN) notification. */
export async function getAdminRecipients(): Promise<PublishRecipient[]> {
  const admins = await prisma.subscriber.findMany({
    where: { isAdmin: true },
    select: {
      email: true,
      subscriptions: {
        select: { unsubscribeToken: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return admins.map((a) => ({
    email: a.email,
    unsubscribeToken: a.subscriptions[0]?.unsubscribeToken ?? null,
  }));
}

/**
 * Active subscriptions to a city's updates (`CITY_UPDATES`), deduplicated by
 * subscriber email (a given subscriber can only have one CITY_UPDATES
 * subscription per city, enforced by a DB constraint, so this is defensive).
 * Returns the subscription id + frequency so the fan-out layer can create
 * AlertDeliveries and route INSTANT vs. digest sends.
 */
export async function getCityUpdateRecipients(
  cityId: number,
): Promise<SubscriptionRecipient[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: { kind: "CITY_UPDATES", cityId, status: "ACTIVE" },
    select: {
      id: true,
      unsubscribeToken: true,
      frequency: true,
      subscriber: { select: { email: true } },
    },
  });

  const byEmail = new Map<string, SubscriptionRecipient>();
  for (const sub of subscriptions) {
    if (!byEmail.has(sub.subscriber.email)) {
      byEmail.set(sub.subscriber.email, {
        subscriptionId: sub.id,
        email: sub.subscriber.email,
        unsubscribeToken: sub.unsubscribeToken,
        frequency: sub.frequency,
      });
    }
  }
  return Array.from(byEmail.values());
}

/**
 * Active subscriptions to a specific interest area's updates
 * (`TOPIC_IN_CITY_UPDATES`), deduplicated by subscriber email. See
 * getCityUpdateRecipients for the same shape/rationale.
 */
export async function getInterestAreaRecipients(
  interestAreaId: number,
): Promise<SubscriptionRecipient[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: { kind: "TOPIC_IN_CITY_UPDATES", interestAreaId, status: "ACTIVE" },
    select: {
      id: true,
      unsubscribeToken: true,
      frequency: true,
      subscriber: { select: { email: true } },
    },
  });

  const byEmail = new Map<string, SubscriptionRecipient>();
  for (const sub of subscriptions) {
    if (!byEmail.has(sub.subscriber.email)) {
      byEmail.set(sub.subscriber.email, {
        subscriptionId: sub.id,
        email: sub.subscriber.email,
        unsubscribeToken: sub.unsubscribeToken,
        frequency: sub.frequency,
      });
    }
  }
  return Array.from(byEmail.values());
}

export const PublishBody = z.object({
  meeting_id: z.number().int().positive(),
});

/**
 * Verifies the shared-secret bearer token. Returns true when authorized.
 * The secret lives in PUBLISH_API_KEY; if it isn't configured the request
 * is rejected so the endpoints are never accidentally left open.
 */
export function isAuthorized(req: Request): boolean {
  const expected = process.env.PUBLISH_API_KEY;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === expected;
}

