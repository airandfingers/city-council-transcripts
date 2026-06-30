import { Resend } from "resend";
import { ConfirmSubscription } from "@/emails/ConfirmSubscription";
import { ManageLink } from "@/emails/ManageLink";
import { MeetingPublished } from "@/emails/MeetingPublished";

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
