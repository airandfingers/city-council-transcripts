import { Resend } from "resend";
import { ConfirmSubscription } from "@/emails/ConfirmSubscription";
import { DigestEmail, type DigestGroup } from "@/emails/DigestEmail";
import { InterestAreaUpdated } from "@/emails/InterestAreaUpdated";
import { ManageLink } from "@/emails/ManageLink";
import { MeetingPublished } from "@/emails/MeetingPublished";
import { UpcomingMeeting } from "@/emails/UpcomingMeeting";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(apiKey);
  return _resend;
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");
  return from;
}

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  return url.replace(/\/$/, "");
}

export function buildManageUrl(unsubscribeToken: string): string {
  return `${getSiteUrl()}/subscriptions?token=${encodeURIComponent(unsubscribeToken)}`;
}

export function buildMeetingUrl(slug: string): string {
  const path = slug
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${getSiteUrl()}/transcripts/${path}`;
}

export async function sendAdminCityRequestEmail(params: {
  requesterEmail: string;
  requestedCityName: string;
  adminEmails: string[];
}) {
  const { adminEmails, requesterEmail, requestedCityName } = params;
  if (adminEmails.length === 0) return;
  const from = getFromAddress();
  const subject = `City request: ${requestedCityName}`;
  const text = [
    `Someone requested a new city on Counciloris.`,
    ``,
    `City: ${requestedCityName}`,
    `Requester: ${requesterEmail}`,
    `Time: ${new Date().toUTCString()}`,
  ].join("\n");
  await Promise.all(
    adminEmails.map(async (to) => {
      const { error } = await getResend().emails.send({ from, to, subject, text });
      if (error) console.error("Failed to send admin city request email to", to, error);
    }),
  );
}

export async function sendTranscriptReviewRequestEmail(params: {
  meetingTitle: string;
  meetingUrl: string;
  requesterNote?: string;
  adminEmails: string[];
}) {
  const { adminEmails, meetingTitle, meetingUrl, requesterNote } = params;
  if (adminEmails.length === 0) return;
  const from = getFromAddress();
  const subject = `Transcript review requested: ${meetingTitle}`;
  const text = [
    `A visitor requested a human review of an AI-generated transcript on Counciloris.`,
    ``,
    `Meeting: ${meetingTitle}`,
    `Link: ${meetingUrl}`,
    ...(requesterNote ? ["", `Note: ${requesterNote}`] : []),
    ``,
    `Time: ${new Date().toUTCString()}`,
  ].join("\n");
  await Promise.all(
    adminEmails.map(async (to) => {
      const { error } = await getResend().emails.send({ from, to, subject, text });
      if (error) console.error("Failed to send review request email to", to, error);
    }),
  );
}

export type ConfirmEmailParams = {
  to: string;
  confirmToken: string;
  description: string;
  unsubscribeToken: string;
};

export async function sendConfirmationEmail({
  to,
  confirmToken,
  description,
  unsubscribeToken,
}: ConfirmEmailParams) {
  const confirmUrl = `${getSiteUrl()}/confirm/${encodeURIComponent(confirmToken)}`;
  const manageUrl = buildManageUrl(unsubscribeToken);
  const { error: e1 } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirm your subscription",
    react: ConfirmSubscription({ confirmUrl, description, manageUrl }),
  });
  if (e1) throw new Error(`Resend error: ${e1.message} (${e1.name})`);
}

export type MeetingPublishedEmailParams = {
  to: string;
  meetingTitle: string;
  cityName: string;
  tldr: string | null;
  keyDecisions: string[];
  meetingUrl: string;
  /** Manage/unsubscribe link; omit for admin notifications. */
  manageUrl?: string;
  /** When true, the subject is tagged "(ADMIN)". */
  isAdmin?: boolean;
};

export async function sendMeetingPublishedEmail({
  to,
  meetingTitle,
  cityName,
  tldr,
  keyDecisions,
  meetingUrl,
  manageUrl,
  isAdmin = false,
}: MeetingPublishedEmailParams) {
  const subject = `Counciloris - ${meetingTitle}${isAdmin ? " (ADMIN)" : ""}`;
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject,
    react: MeetingPublished({
      meetingTitle,
      cityName,
      tldr,
      keyDecisions,
      meetingUrl,
      manageUrl,
    }),
  });
  if (error) throw new Error(`Resend error: ${error.message} (${error.name})`);
  console.log(`[email] sent to ${to}, Resend id=${data?.id}`);
}

export type UpcomingMeetingEmailParams = {
  to: string;
  meetingTitle: string;
  cityName: string;
  meetingDate: Date;
  /** One-line teaser — the quickest possible read. */
  bite: string;
  /** Short paragraph for a casual reader. */
  snack: string;
  /** Fuller narrative for someone who wants the full picture. */
  meal: string;
  meetingUrl: string;
  manageUrl?: string;
  isAdmin?: boolean;
  /** False when no agenda has been posted yet — see UpcomingMeeting.tsx. */
  agendaAvailable?: boolean;
};

export async function sendUpcomingMeetingEmail({
  to,
  meetingTitle,
  cityName,
  meetingDate,
  bite,
  snack,
  meal,
  meetingUrl,
  manageUrl,
  isAdmin = false,
  agendaAvailable = true,
}: UpcomingMeetingEmailParams) {
  const subject = `Counciloris - Upcoming: ${meetingTitle}${isAdmin ? " (ADMIN)" : ""}`;
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject,
    react: UpcomingMeeting({
      meetingTitle,
      cityName,
      meetingDate,
      bite,
      snack,
      meal,
      meetingUrl,
      manageUrl,
      agendaAvailable,
    }),
  });
  if (error) throw new Error(`Resend error: ${error.message} (${error.name})`);
  console.log(`[email] upcoming sent to ${to}, Resend id=${data?.id}`);
}

export type InterestAreaEmailParams = {
  to: string;
  areaName: string;
  cityName: string;
  tldr: string | null;
  highlights: string[];
  areaUrl: string;
  manageUrl?: string;
  isAdmin?: boolean;
};

export async function sendInterestAreaEmail({
  to,
  areaName,
  cityName,
  tldr,
  highlights,
  areaUrl,
  manageUrl,
  isAdmin = false,
}: InterestAreaEmailParams) {
  const subject = `Counciloris - Update: ${areaName} (${cityName})${isAdmin ? " (ADMIN)" : ""}`;
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject,
    react: InterestAreaUpdated({
      areaName,
      cityName,
      tldr,
      highlights,
      areaUrl,
      manageUrl,
    }),
  });
  if (error) throw new Error(`Resend error: ${error.message} (${error.name})`);
  console.log(`[email] interest-area sent to ${to}, Resend id=${data?.id}`);
}

export type ManageLinkEmailParams = {
  to: string;
  unsubscribeToken: string;
};

export async function sendManageLinkEmail({
  to,
  unsubscribeToken,
}: ManageLinkEmailParams) {
  const manageUrl = buildManageUrl(unsubscribeToken);
  const { error: e2 } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "Manage your subscriptions",
    react: ManageLink({ manageUrl }),
  });
  if (e2) throw new Error(`Resend error: ${e2.message} (${e2.name})`);
}

export type DigestEmailParams = {
  to: string;
  /** e.g. "Daily", "Weekly", "Monthly". */
  frequencyLabel: string;
  groups: DigestGroup[];
  manageUrl?: string;
};

/** One bundled email covering every due AlertDelivery for a subscriber's cadence tick. */
export async function sendDigestEmail({
  to,
  frequencyLabel,
  groups,
  manageUrl,
}: DigestEmailParams) {
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);
  const subject = `Counciloris ${frequencyLabel} digest — ${itemCount} update${itemCount === 1 ? "" : "s"}`;
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject,
    react: DigestEmail({ frequencyLabel, groups, manageUrl }),
  });
  if (error) throw new Error(`Resend error: ${error.message} (${error.name})`);
  console.log(`[email] digest (${frequencyLabel}) sent to ${to}, Resend id=${data?.id}`);
}
