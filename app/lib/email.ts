import { Resend } from "resend";
import { ConfirmSubscription } from "@/emails/ConfirmSubscription";
import { ManageLink } from "@/emails/ManageLink";

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
  await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirm your subscription",
    react: ConfirmSubscription({ confirmUrl, description, manageUrl }),
  });
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
  await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "Manage your subscriptions",
    react: ManageLink({ manageUrl }),
  });
}
