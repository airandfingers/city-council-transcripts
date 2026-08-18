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
 * (`Alert.sentToAdminsAt` is null — the same ledger `sendAlertToAdmins` used
 * to set) into a single daily digest email per admin.
 *
 * Admin notification is now always routed through this digest — nothing
 * calls `sendAlertToAdmins` inline anymore (see FEAT-ADMIN-DIGEST-ALWAYS-001
 * in prd.md), so a bundled alert may already be `PUBLISHED` by the time this
 * runs (e.g. a time-sensitive upcoming-meeting/preview alert that fans out
 * to subscribers instantly, independent of admin review). For a still-
 * `DRAFTED` alert, bundling also flips it to `SENT_TO_ADMINS` so the
 * existing subscriber drain (`publishDueScheduledAlerts`) can release it on
 * its normal hold window; an already-`PUBLISHED` alert is left alone aside
 * from stamping `sentToAdminsAt` — it must not be pushed back through the
 * drain and re-sent to subscribers. Called by the `/api/cron/admin-digest`
 * route, scheduled to run before `publish-scheduled` so admins are never
 * notified after subscribers for the alerts that do wait on review.
 *
 * @module adminDigest
 */

export type AdminDigestResult = {
  adminsEmailed: number;
  alertsBundled: number;
  staleAgendasFlagged: number;
  failed: { email: string; error: string }[];
};

/**
 * Days ahead a SCHEDULED meeting must be within to be checked for the
 * false-green condition below. Meetings further out are still routinely
 * missing an agenda for entirely legitimate reasons (not posted yet).
 */
const STALE_AGENDA_LOOKAHEAD_DAYS = 3;

/**
 * Find SCHEDULED meetings whose `agendaLastFetchedAt` looks fresh (a scrape
 * ran recently) but that have zero `AgendaItemVersion`/`MeetingDocument`
 * rows underneath them — the exact false-green that hid Monterey Park's
 * 2026-08-19 Regular Meeting agenda. Nothing previously read
 * `ScrapeState.last_error` or noticed a zero-yield fetch on the Python side,
 * so `agendaLastFetchedAt` read as healthy while `_build_agenda_items_from_meeting_dir()`
 * silently returned `[]` (see FIX-MP-SAMEDAY-MEETING-COLLISION-001). This
 * check runs entirely against Neon, which both the scraper and this digest
 * already share, rather than needing new plumbing to ship the Python side's
 * on-disk `ScrapeState.last_error` across processes.
 *
 * Deliberately excludes meetings with `agendaLastFetchedAt: null` — those
 * simply haven't been scraped yet at all, a different (and already visible)
 * condition, not the "scraped but silently empty" one this guards against.
 */
async function findStaleAgendaMeetings(now: Date) {
  const lookaheadEnd = new Date(now.getTime() + STALE_AGENDA_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.meeting.findMany({
    where: {
      status: "SCHEDULED",
      date: { gte: now, lte: lookaheadEnd },
      agendaLastFetchedAt: { not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      agendaLastFetchedAt: true,
      city: { select: { name: true } },
      _count: { select: { agendaItemVersions: true, documents: true } },
    },
  });
  return candidates.filter((m) => m._count.agendaItemVersions === 0 && m._count.documents === 0);
}

export async function sendDueAdminDigest(now: Date = new Date()): Promise<AdminDigestResult> {
  const pending = await prisma.alert.findMany({
    where: { status: { not: "CANCELED" }, sentToAdminsAt: null },
    select: {
      id: true,
      type: true,
      content: true,
      meetingId: true,
      interestAreaId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Deliberately not an early-return on `pending.length === 0` (unlike the
  // Alert-driven path below) — the stale-agenda check further down must
  // still run even when there's nothing else to bundle, or a scrape that's
  // been silently zero-yielding for a city with no pending Alert of its own
  // would never surface. See findStaleAgendaMeetings's docstring.

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

  // Runs regardless of whether any Alert rows are pending — a persistent
  // zero-yield scrape doesn't necessarily raise an Alert of its own (an
  // "upcoming, no agenda yet" placeholder alert fires once and then waits
  // silently for a real agenda; if the agenda actually posted upstream but
  // never made it into Neon, nothing re-fires), so gating this on
  // bundledAlertIds would recreate the same blind spot it exists to close.
  const staleAgendas = await findStaleAgendaMeetings(now);
  for (const meeting of staleAgendas) {
    items.push({
      groupKey: `city:${meeting.city.name}`,
      groupHeading: meeting.city.name,
      title: `⚠️ Agenda fetch looks stuck: ${meeting.title}`,
      summary:
        `Scraped ${meeting.agendaLastFetchedAt?.toISOString() ?? "recently"} but has 0 agenda ` +
        `items and 0 documents — meets on ${meeting.date.toISOString().slice(0, 10)}. ` +
        `Likely a silently-failed or misrouted fetch, not "nothing posted yet."`,
      url: buildMeetingUrl(meeting.slug),
    });
  }

  if (bundledAlertIds.length === 0 && staleAgendas.length === 0) {
    return { adminsEmailed: 0, alertsBundled: 0, staleAgendasFlagged: 0, failed: [] };
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
  // failures — the content is the same "reviewed" snapshot either way.
  // Only a still-DRAFTED alert transitions to SENT_TO_ADMINS (unblocking the
  // scheduled subscriber drain); an alert that's already PUBLISHED (instant
  // subscriber fan-out, e.g. upcoming-with-agenda/preview) keeps that status
  // — flipping it back to SENT_TO_ADMINS would make the drain re-publish it.
  await prisma.alert.updateMany({
    where: { id: { in: bundledAlertIds }, status: "DRAFTED" },
    data: { status: "SENT_TO_ADMINS", sentToAdminsAt: now },
  });
  await prisma.alert.updateMany({
    where: { id: { in: bundledAlertIds }, status: { not: "DRAFTED" } },
    data: { sentToAdminsAt: now },
  });

  return {
    adminsEmailed,
    alertsBundled: bundledAlertIds.length,
    staleAgendasFlagged: staleAgendas.length,
    failed,
  };
}
