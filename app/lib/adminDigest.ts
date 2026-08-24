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
 * Find SCHEDULED meetings that have been scraped at all
 * (`agendaLastFetchedAt` is set — deliberately excludes meetings that
 * simply haven't been scraped yet, a different and already-visible
 * condition) but have zero `AgendaItemVersion`/`MeetingDocument` rows
 * underneath them.
 *
 * Note this does NOT check that the scrape was *recent* — only that it
 * happened at all — despite an earlier version of this docstring claiming
 * otherwise. That was deliberate even then (any zero-yield scrape is worth
 * surfacing, not just a fresh one), just imprecisely described.
 *
 * FIX-AGENDA-ITEMS-NEVER-EXTRACTED-001 correction: this check was
 * originally believed to be Fort-Collins/Monterey-Park-specific plumbing
 * that "correctly flags 3 real Seattle zero-yield meetings" (see
 * FIX-MP-SAMEDAY-MEETING-COLLISION-001) — i.e. those 3 were treated as
 * validating true positives. Confirmed live against prod Neon that this
 * was never Seattle-specific: **all 84** Seattle meetings (and all 53 Fort
 * Collins meetings) were zero-yield at the time, a structural gap in the
 * Python-side scrapers for those two cities, not isolated bad luck. The 3
 * were only visible because they happened to fall inside this check's
 * lookahead window. That scraper-side gap is now fixed
 * (city-council-transcriber), so this check firing at all going forward is
 * a genuine signal again, not a permanent false-green source.
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
      staleAgendaNotifiedAt: true,
      city: { select: { name: true } },
      _count: { select: { agendaItemVersions: true, documents: true } },
    },
  });
  return candidates.filter((m) => m._count.agendaItemVersions === 0 && m._count.documents === 0);
}

/** Once a meeting's already been flagged once, only resurface it again this
 * close to the meeting actually happening — a persistently-broken agenda
 * this near the meeting is worth one more nudge, not silence purely because
 * it was reported days earlier. */
const RE_ESCALATE_WITHIN_HOURS = 24;

/**
 * Of the stale-agenda candidates, which should actually appear in *this*
 * digest. Mirrors `createMeetingUpdateAlert`'s dedupe rationale (`alerts.ts`)
 * — "an old meeting caught in reprocessing doesn't resurface in admin
 * digests day after day" — but stores its own marker on `Meeting` rather
 * than routing through the `Alert` table, since `AlertStatus` includes
 * `PUBLISHED` and published Alerts are subscriber-facing; this is an
 * internal admin diagnostic that must never reach a real subscriber.
 */
function selectStaleAgendaMeetingsToNotify(
  candidates: Awaited<ReturnType<typeof findStaleAgendaMeetings>>,
  now: Date,
) {
  return candidates.filter((meeting) => {
    if (!meeting.staleAgendaNotifiedAt) return true;
    const hoursUntilMeeting = (meeting.date.getTime() - now.getTime()) / (60 * 60 * 1000);
    return hoursUntilMeeting <= RE_ESCALATE_WITHIN_HOURS;
  });
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
          title: content.agendaAvailable
            ? `Upcoming: ${content.subject}`
            : `Upcoming (no agenda yet): ${content.subject}`,
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
  const staleAgendaCandidates = await findStaleAgendaMeetings(now);
  const staleAgendas = selectStaleAgendaMeetingsToNotify(staleAgendaCandidates, now);
  for (const meeting of staleAgendas) {
    items.push({
      groupKey: `city:${meeting.city.name}`,
      groupHeading: meeting.city.name,
      title: `⚠️ Agenda fetch looks stuck: ${meeting.title}`,
      summary:
        `Scraped ${meeting.agendaLastFetchedAt?.toISOString() ?? "recently"} but has 0 agenda ` +
        `items and 0 documents — meets on ${meeting.date.toISOString().slice(0, 10)}. ` +
        // Not necessarily a failed or misrouted fetch — the agenda source
        // itself may have been fetched successfully with nothing extracted
        // from it. Confirmed live (FIX-AGENDA-ITEMS-NEVER-EXTRACTED-001)
        // that this was previously true of every Fort Collins and Seattle
        // meeting, not a per-meeting failure — state the observed fact,
        // not a diagnosis this check can't actually confirm.
        `The agenda source was scraped, but no agenda items or documents ` +
        `were extracted from it.`,
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

  // Stamp the dedupe marker for every stale-agenda meeting actually
  // included in this digest — regardless of per-admin send failures above,
  // matching the Alert-stamping rationale: the content included in this
  // digest attempt is the same "reviewed" snapshot either way.
  if (staleAgendas.length > 0) {
    await prisma.meeting.updateMany({
      where: { id: { in: staleAgendas.map((m) => m.id) } },
      data: { staleAgendaNotifiedAt: now },
    });
  }

  return {
    adminsEmailed,
    alertsBundled: bundledAlertIds.length,
    staleAgendasFlagged: staleAgendas.length,
    failed,
  };
}
