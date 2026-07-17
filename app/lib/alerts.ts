import prisma from "@/app/lib/prisma";
import { Alert } from "@prisma/client";
import {
  buildManageUrl,
  buildMeetingUrl,
  sendInterestAreaEmail,
  sendMeetingPublishedEmail,
  sendUpcomingMeetingEmail,
} from "@/app/lib/email";
import {
  getAdminRecipients,
  getCityUpdateRecipients,
  getInterestAreaRecipients,
  getPublishMeeting,
  isMeetingTooOldForUserAlerts,
} from "@/app/lib/publish";

/**
 * Two-stage alert pipeline shared by every alert type:
 *   1. create*Alert() snapshots the change as a DRAFTED Alert.
 *   2. sendAlertToAdmins() emails the draft to admins for review (SENT_TO_ADMINS).
 *   3. publishAlertToSubscribers() is the admin's manual trigger to notify
 *      end-user subscribers with the reviewed content (PUBLISHED).
 *
 * Supported alert types:
 *   - MEETING_UPDATED — "this meeting happened" post-meeting summary
 *   - MEETING_UPCOMING — "this meeting is coming up" pre-meeting agenda preview
 *   - INTEREST_AREA_UPDATED — a topic of interest was discussed at a meeting
 *
 * @module alerts
 */

// ---------------------------------------------------------------------------
// AlertContent — discriminated by the companion Alert.type column
// ---------------------------------------------------------------------------

/** Content for a MEETING_UPDATED alert ("this meeting happened"). */
export type MeetingUpdatedContent = {
  subject: string;
  tldr: string | null;
  keyDecisions: string[];
};

/**
 * Content for a MEETING_UPCOMING alert ("this meeting is coming up").
 * Structured as three reading-depth tiers:
 *   bite  — one-line teaser (the quickest possible read)
 *   snack — short paragraph for a casual reader
 *   meal  — fuller narrative for someone who wants the full picture
 */
export type MeetingUpcomingContent = {
  subject: string;
  bite: string;
  snack: string;
  meal: string;
  /** False when no agenda has been posted yet — see UpcomingMeeting.tsx. */
  agendaAvailable?: boolean;
};

/**
 * Content for an INTEREST_AREA_UPDATED alert ("topic discussed at a meeting").
 * When `phase` is "preview", this is a pre-meeting agenda-only signal (the
 * topic is *expected* to come up at an upcoming meeting) rather than a
 * confirmed post-meeting finding — `meetingTitle`/`meetingDate` are set so
 * the email can link to that meeting's (possibly agenda-only) page.
 */
export type InterestAreaUpdatedContent = {
  subject: string;
  tldr: string | null;
  highlights: string[];
  phase?: "preview" | "postmeeting";
  meetingTitle?: string;
  meetingDate?: string;
  discussionExpected?: boolean;
  signalStrength?: string;
};

/** Union of all alert content shapes, discriminated by Alert.type. */
export type AlertContent =
  | MeetingUpdatedContent
  | MeetingUpcomingContent
  | InterestAreaUpdatedContent;

export type AlertSendResult = {
  sent: number;
  failed: string[];
  /** True when the send was skipped entirely (e.g. meeting too old for user alerts). */
  skipped?: boolean;
  skippedReason?: string;
};

/**
 * Minimum hold window, in hours, between an alert being created (admins
 * notified) and it auto-publishing to end-user subscribers. Configurable via
 * PUBLISH_HOLD_WINDOW_HOURS; defaults to 24h (conservative). Invalid or
 * missing values fall back to the default.
 */
export function getHoldWindowHours(): number {
  const raw = process.env.PUBLISH_HOLD_WINDOW_HOURS;
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 24;
}

/**
 * The timestamp at which a newly created alert becomes *eligible* to
 * auto-send — this is a minimum, not the actual send time. The drain
 * (`publishDueScheduledAlerts`, called by a once-daily cron — see
 * vercel.json / .github/workflows/publish-scheduled.yml) only runs once a
 * day, so the real release happens at the next cron run at/after this
 * timestamp: currently ~6am Pacific (both crons target 13:00 UTC), so
 * actual delay ranges from the hold window up to ~24h beyond it.
 */
function computeScheduledFor(): Date {
  return new Date(Date.now() + getHoldWindowHours() * 3_600_000);
}

// ---------------------------------------------------------------------------
// Alert creators
// ---------------------------------------------------------------------------

/**
 * Creates a DRAFTED alert snapshotting a meeting's current post-meeting
 * content. Deduped against any still-DRAFTED MEETING_UPDATED alert already
 * pending for this meeting: a repeat call with unchanged content (e.g. a
 * backfill/reprocessing run touching the same meeting more than once before
 * the daily admin digest sweeps it) is a no-op rather than a fresh row, so
 * an old meeting caught in reprocessing doesn't resurface in admin digests
 * day after day. A repeat call with genuinely changed content updates the
 * pending alert in place instead of creating a duplicate.
 */
export async function createMeetingUpdateAlert(meetingId: number): Promise<Alert> {
  const meeting = await getPublishMeeting(meetingId);
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const content: MeetingUpdatedContent = {
    subject: meeting.title,
    tldr: meeting.tldr,
    keyDecisions: meeting.keyDecisions,
  };

  const pendingAlert = await prisma.alert.findFirst({
    where: { meetingId, type: "MEETING_UPDATED", status: "DRAFTED" },
    orderBy: { createdAt: "desc" },
  });

  if (pendingAlert) {
    if (JSON.stringify(pendingAlert.content) === JSON.stringify(content)) {
      return pendingAlert;
    }
    return prisma.alert.update({
      where: { id: pendingAlert.id },
      data: { content, scheduledFor: computeScheduledFor() },
    });
  }

  return prisma.alert.create({
    data: {
      type: "MEETING_UPDATED",
      meetingId,
      content,
      status: "DRAFTED",
      scheduledFor: computeScheduledFor(),
    },
  });
}

/**
 * Creates a DRAFTED alert for an upcoming meeting.
 * The bite/snack/meal tiered summary is generated by the Python scraper and
 * passed in — this function only persists and routes it.
 */
export async function createMeetingUpcomingAlert(
  meetingId: number,
  tiers: Pick<MeetingUpcomingContent, "bite" | "snack" | "meal" | "agendaAvailable">,
): Promise<Alert> {
  const meeting = await getPublishMeeting(meetingId);
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const content: MeetingUpcomingContent = {
    subject: meeting.title,
    ...tiers,
  };

  // MEETING_UPCOMING is a *pre-meeting* notice (should reach subscribers
  // before the meeting, per prd.md AC-2.2). A fixed post-creation hold could
  // push delivery past the meeting, so this type is left on the manual
  // publish path (scheduledFor null → the scheduled drain skips it).
  return prisma.alert.create({
    data: {
      type: "MEETING_UPCOMING",
      meetingId,
      content,
      status: "DRAFTED",
    },
  });
}

/**
 * Options for a pre-meeting PREVIEW-phase interest-area alert: the topic is
 * *expected* to be discussed at an upcoming meeting, per agenda-only LLM
 * classification (see interest_area_summarizer.py::preview_meeting_for_interest_areas
 * in city-council-transcriber). When omitted, the alert is built from the
 * InterestArea's city-wide statusSummary rollup (today's post-meeting path).
 */
export type InterestAreaPreviewOptions = {
  meetingId: number;
  summary?: string;
  discussionExpected?: boolean;
  signalStrength?: string;
};

/**
 * Creates a DRAFTED alert for an interest area update. Without `preview`,
 * the summary content is derived from the InterestArea's current
 * statusSummary (post-meeting rollup). With `preview`, the content is
 * meeting-specific pre-meeting agenda signal instead, and the alert carries
 * `meetingId` so the email can link to that (possibly agenda-only) meeting
 * page rather than a bare topics URL.
 */
export async function createInterestAreaAlert(
  interestAreaId: number,
  preview?: InterestAreaPreviewOptions,
): Promise<Alert> {
  const area = await prisma.interestArea.findUnique({
    where: { id: interestAreaId },
    select: { name: true, statusSummary: true },
  });
  if (!area) throw new Error(`InterestArea ${interestAreaId} not found`);

  let content: InterestAreaUpdatedContent;
  let meetingId: number | undefined;

  if (preview) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: preview.meetingId },
      select: { title: true, date: true },
    });
    if (!meeting) throw new Error(`Meeting ${preview.meetingId} not found`);

    meetingId = preview.meetingId;
    content = {
      subject: area.name,
      tldr: preview.summary ?? null,
      highlights: [],
      phase: "preview",
      meetingTitle: meeting.title,
      meetingDate: meeting.date.toISOString(),
      discussionExpected: preview.discussionExpected,
      signalStrength: preview.signalStrength,
    };
  } else {
    content = {
      subject: area.name,
      tldr: area.statusSummary ?? null,
      highlights: [],
      phase: "postmeeting",
    };
  }

  return prisma.alert.create({
    data: {
      type: "INTEREST_AREA_UPDATED",
      interestAreaId,
      meetingId,
      content,
      status: "DRAFTED",
      scheduledFor: computeScheduledFor(),
    },
  });
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

/** Emails the draft to admin subscribers for review. */
export async function sendAlertToAdmins(alertId: number): Promise<AlertSendResult> {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const result = await sendAlertEmails(alert, await getAdminRecipients(), {
    isAdmin: true,
  });

  await prisma.alert.update({
    where: { id: alertId },
    data: { status: "SENT_TO_ADMINS", sentToAdminsAt: new Date() },
  });

  return result;
}

/**
 * Admin's manual trigger (or the direct-publish endpoint): fans the reviewed
 * content out to end-user subscribers, respecting each subscription's alert
 * frequency. An AlertDelivery row is created for every matching subscription
 * (idempotent — safe to call more than once for the same alert); INSTANT
 * subscriptions are emailed immediately and marked SENT, while DAILY/WEEKLY/
 * MONTHLY subscriptions are left PENDING for the next digest run
 * (app/lib/digest.ts::sendDueDigests) to bundle into a single email.
 */
export async function publishAlertToSubscribers(
  alertId: number,
  triggeredBy?: string,
): Promise<AlertSendResult> {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  // Guard: never email end-user subscribers about meetings older than the
  // configured age limit. Admin review emails (sendAlertToAdmins) are
  // unaffected — this only gates the subscriber-facing send.
  if (await isAlertMeetingTooOldForSubscribers(alert)) {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        canceledBy: "system:meeting-too-old",
      },
    });
    return {
      sent: 0,
      failed: [],
      skipped: true,
      skippedReason: "meeting is older than the user-alert age limit",
    };
  }

  const recipients = await getSubscriberRecipients(alert);

  // Queue a PENDING delivery for every matching subscription up front so the
  // digest job has a record to bundle later, regardless of frequency.
  // skipDuplicates makes this safe to re-run for an alert already fanned out.
  if (recipients.length > 0) {
    await prisma.alertDelivery.createMany({
      data: recipients.map((r) => ({
        alertId,
        subscriptionId: r.subscriptionId,
        frequency: r.frequency,
      })),
      skipDuplicates: true,
    });
  }

  const instantRecipients = recipients.filter((r) => r.frequency === "INSTANT");
  const result = await sendAlertEmails(alert, instantRecipients, { isAdmin: false });

  const failedEmails = new Set(result.failed);
  const sentSubscriptionIds = instantRecipients
    .filter((r) => !failedEmails.has(r.email))
    .map((r) => r.subscriptionId);

  if (sentSubscriptionIds.length > 0) {
    await prisma.alertDelivery.updateMany({
      where: { alertId, subscriptionId: { in: sentSubscriptionIds } },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      publishedBy: triggeredBy ?? null,
    },
  });

  return result;
}

/**
 * Cancels an alert so the scheduled auto-send skips it. Admin "hold" action;
 * a canceled alert can no longer be drained (it leaves the DRAFTED/
 * SENT_TO_ADMINS states the drain looks for).
 */
export async function cancelScheduledAlert(
  alertId: number,
  canceledBy?: string,
): Promise<Alert> {
  return prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      canceledBy: canceledBy ?? null,
    },
  });
}

export type DrainResult = {
  processed: number;
  published: number;
  failed: { alertId: number; error: string }[];
};

/**
 * Publishes every alert whose hold window has elapsed: `scheduledFor <= now`
 * and still awaiting release. Only SENT_TO_ADMINS alerts qualify — this
 * enforces the "admins preview first" invariant, so an alert whose admin
 * notification never went out (still DRAFTED) is never auto-blasted to users.
 * Alerts with a null `scheduledFor` (e.g. MEETING_UPCOMING / pre-scheduling
 * rows) and CANCELED/PUBLISHED alerts are left untouched. Each publish is
 * isolated so one failure doesn't abort the batch. Called by the cron drain
 * endpoint; frequency-agnostic.
 */
export async function publishDueScheduledAlerts(
  now: Date = new Date(),
  triggeredBy = "cron",
): Promise<DrainResult> {
  const due = await prisma.alert.findMany({
    where: {
      scheduledFor: { not: null, lte: now },
      status: "SENT_TO_ADMINS",
    },
    select: { id: true },
    orderBy: { scheduledFor: "asc" },
  });

  let published = 0;
  const failed: DrainResult["failed"] = [];
  for (const { id } of due) {
    try {
      await publishAlertToSubscribers(id, triggeredBy);
      published += 1;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`Failed to publish scheduled alert ${id}`, err);
      failed.push({ alertId: id, error });
    }
  }

  return { processed: due.length, published, failed };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * True when the alert's underlying meeting is too old for a subscriber
 * send. INTEREST_AREA_UPDATED alerts created from the postmeeting rollup
 * (no `meetingId` — see createInterestAreaAlert) resolve a representative
 * date from the area's most recently discussed meeting instead, so a
 * backfill/reprocessing run touching a years-old meeting still gets
 * age-gated like every other alert type.
 */
async function isAlertMeetingTooOldForSubscribers(alert: Alert): Promise<boolean> {
  if (alert.meetingId) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: alert.meetingId },
      select: { date: true },
    });
    return meeting ? isMeetingTooOldForUserAlerts(meeting.date) : false;
  }

  if (!alert.interestAreaId) return false;
  const mostRecentDiscussed = await prisma.interestAreaMeetingStatus.findFirst({
    where: { interestAreaId: alert.interestAreaId, phase: "POSTMEETING", discussed: true },
    orderBy: { meeting: { date: "desc" } },
    select: { meeting: { select: { date: true } } },
  });
  return mostRecentDiscussed ? isMeetingTooOldForUserAlerts(mostRecentDiscussed.meeting.date) : false;
}

async function getSubscriberRecipients(alert: Alert) {
  switch (alert.type) {
    case "MEETING_UPDATED":
    case "MEETING_UPCOMING": {
      if (!alert.meetingId) throw new Error(`Alert ${alert.id} is missing meetingId`);
      const meeting = await prisma.meeting.findUniqueOrThrow({
        where: { id: alert.meetingId },
        select: { cityId: true },
      });
      return getCityUpdateRecipients(meeting.cityId);
    }
    case "INTEREST_AREA_UPDATED": {
      if (!alert.interestAreaId)
        throw new Error(`Alert ${alert.id} is missing interestAreaId`);
      return getInterestAreaRecipients(alert.interestAreaId);
    }
  }
}

async function sendAlertEmails(
  alert: Alert,
  recipients: { email: string; unsubscribeToken: string | null }[],
  opts: { isAdmin: boolean },
): Promise<AlertSendResult> {
  let sent = 0;
  const failed: string[] = [];

  switch (alert.type) {
    case "MEETING_UPDATED": {
      if (!alert.meetingId) throw new Error(`Alert ${alert.id} is missing meetingId`);
      const meeting = await prisma.meeting.findUniqueOrThrow({
        where: { id: alert.meetingId },
        select: { slug: true, city: { select: { name: true } } },
      });
      const content = alert.content as MeetingUpdatedContent;
      const meetingUrl = buildMeetingUrl(meeting.slug);
      for (const recipient of recipients) {
        try {
          await sendMeetingPublishedEmail({
            to: recipient.email,
            meetingTitle: content.subject,
            cityName: meeting.city.name,
            tldr: content.tldr,
            keyDecisions: content.keyDecisions,
            meetingUrl,
            manageUrl: recipient.unsubscribeToken
              ? buildManageUrl(recipient.unsubscribeToken)
              : undefined,
            isAdmin: opts.isAdmin,
          });
          sent += 1;
        } catch (err) {
          console.error(`Failed to send alert email to ${recipient.email}`, err);
          failed.push(recipient.email);
        }
      }
      break;
    }

    case "MEETING_UPCOMING": {
      if (!alert.meetingId) throw new Error(`Alert ${alert.id} is missing meetingId`);
      const meeting = await prisma.meeting.findUniqueOrThrow({
        where: { id: alert.meetingId },
        select: { slug: true, date: true, city: { select: { name: true } } },
      });
      const content = alert.content as MeetingUpcomingContent;
      const meetingUrl = buildMeetingUrl(meeting.slug);
      for (const recipient of recipients) {
        try {
          await sendUpcomingMeetingEmail({
            to: recipient.email,
            meetingTitle: content.subject,
            cityName: meeting.city.name,
            meetingDate: meeting.date,
            bite: content.bite,
            snack: content.snack,
            meal: content.meal,
            meetingUrl,
            manageUrl: recipient.unsubscribeToken
              ? buildManageUrl(recipient.unsubscribeToken)
              : undefined,
            isAdmin: opts.isAdmin,
            agendaAvailable: content.agendaAvailable,
          });
          sent += 1;
        } catch (err) {
          console.error(`Failed to send upcoming alert email to ${recipient.email}`, err);
          failed.push(recipient.email);
        }
      }
      break;
    }

    case "INTEREST_AREA_UPDATED": {
      if (!alert.interestAreaId)
        throw new Error(`Alert ${alert.id} is missing interestAreaId`);
      const area = await prisma.interestArea.findUniqueOrThrow({
        where: { id: alert.interestAreaId },
        select: { slug: true, city: { select: { name: true, stateCode: true } } },
      });
      const content = alert.content as InterestAreaUpdatedContent;
      // When this alert carries a meetingId (e.g. a pre-meeting PREVIEW
      // signal — see createInterestAreaAlert's `preview` option), link
      // straight to that meeting's page instead of a bare topics URL.
      let areaUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}`;
      if (alert.meetingId) {
        const meeting = await prisma.meeting.findUnique({
          where: { id: alert.meetingId },
          select: { slug: true },
        });
        if (meeting) areaUrl = buildMeetingUrl(meeting.slug);
      }
      // TODO: build a proper interest-area URL (once meetingId is absent)
      // once the Topics page exists
      for (const recipient of recipients) {
        try {
          await sendInterestAreaEmail({
            to: recipient.email,
            areaName: content.subject,
            cityName: area.city.name,
            tldr: content.tldr,
            highlights: content.highlights,
            areaUrl,
            manageUrl: recipient.unsubscribeToken
              ? buildManageUrl(recipient.unsubscribeToken)
              : undefined,
            isAdmin: opts.isAdmin,
          });
          sent += 1;
        } catch (err) {
          console.error(
            `Failed to send interest-area alert email to ${recipient.email}`,
            err,
          );
          failed.push(recipient.email);
        }
      }
      break;
    }
  }

  return { sent, failed };
}
