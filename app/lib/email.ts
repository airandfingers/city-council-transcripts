import { Resend } from "resend";
import { ConfirmSubscription } from "@/emails/ConfirmSubscription";

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

export type ConfirmEmailParams = {
  to: string;
  confirmToken: string;
  description: string;
};

export async function sendConfirmationEmail({
  to,
  confirmToken,
  description,
}: ConfirmEmailParams) {
  const confirmUrl = `${getSiteUrl()}/confirm/${encodeURIComponent(confirmToken)}`;
  await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "Confirm your subscription",
    react: ConfirmSubscription({ confirmUrl, description }),
  });
}
