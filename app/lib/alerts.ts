import prisma from "@/app/lib/prisma";
import { Alert } from "@prisma/client";
import {
  buildManageUrl,
  buildMeetingUrl,
  sendMeetingPublishedEmail,
} from "@/app/lib/email";
import { getAdminRecipients, getCityUpdateRecipients, getPublishMeeting } from "@/app/lib/publish";

/**
 * Two-stage alert pipeline shared by every alert type:
 *   1. create*Alert() snapshots the change as a DRAFTED Alert.
 *   2. sendAlertToAdmins() emails the draft to admins for review (SENT_TO_ADMINS).
 *   3. publishAlertToSubscribers() is the admin's manual trigger to notify
 *      end-user subscribers with the reviewed content (PUBLISHED).
 *
 * Only MEETING_UPDATED is wired up; INTEREST_AREA_UPDATED is the next case
 * this abstraction is meant to support without changing this file's shape.
 *
 * @module alerts
 */

export type AlertContent = {
  subject: string;
  tldr: string | null;
  keyDecisions: string[];
};

export type AlertSendResult = { sent: number; failed: string[] };

/** Creates a DRAFTED alert snapshotting a meeting's current content. */
export async function createMeetingUpdateAlert(meetingId: number): Promise<Alert> {
  const meeting = await getPublishMeeting(meetingId);
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const content: AlertContent = {
    subject: meeting.title,
    tldr: meeting.tldr,
    keyDecisions: meeting.keyDecisions,
  };

  return prisma.alert.create({
    data: {
      type: "MEETING_UPDATED",
      meetingId,
      content,
      status: "DRAFTED",
    },
  });
}

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

/** Admin's manual trigger: sends the reviewed content to end-user subscribers. */
export async function publishAlertToSubscribers(
  alertId: number,
  triggeredBy?: string,
): Promise<AlertSendResult> {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const recipients = await getSubscriberRecipients(alert);
  const result = await sendAlertEmails(alert, recipients, { isAdmin: false });

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

async function getSubscriberRecipients(alert: Alert) {
  switch (alert.type) {
    case "MEETING_UPDATED": {
      if (!alert.meetingId) throw new Error(`Alert ${alert.id} is missing meetingId`);
      const meeting = await prisma.meeting.findUniqueOrThrow({
        where: { id: alert.meetingId },
        select: { cityId: true },
      });
      return getCityUpdateRecipients(meeting.cityId);
    }
    case "INTEREST_AREA_UPDATED":
      throw new Error("INTEREST_AREA_UPDATED alerts are not yet supported");
  }
}

async function sendAlertEmails(
  alert: Alert,
  recipients: { email: string; unsubscribeToken: string | null }[],
  opts: { isAdmin: boolean },
): Promise<AlertSendResult> {
  if (!alert.meetingId) throw new Error(`Alert ${alert.id} is missing meetingId`);

  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: alert.meetingId },
    select: { slug: true, city: { select: { name: true } } },
  });
  const content = alert.content as AlertContent;
  const meetingUrl = buildMeetingUrl(meeting.slug);

  let sent = 0;
  const failed: string[] = [];
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

  return { sent, failed };
}
