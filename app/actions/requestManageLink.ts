"use server";

import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { sendManageLinkEmail } from "@/app/lib/email";

const Input = z.object({
  email: z.string().email().max(320).transform((v) => v.trim().toLowerCase()),
  honeypot: z.string().optional(),
});

export type RequestManageLinkInput = z.input<typeof Input>;
export type RequestManageLinkResult =
  | { ok: true }
  | { ok: false; error: string };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function requestManageLink(
  input: RequestManageLinkInput,
): Promise<RequestManageLinkResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email" };
  }
  const data = parsed.data;

  if (data.honeypot && data.honeypot.length > 0) {
    return { ok: true };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`manage-link:${ip}`)) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { email: data.email },
    select: {
      subscriptions: {
        select: { unsubscribeToken: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const subscription = subscriber?.subscriptions[0];
  if (subscription) {
    try {
      await sendManageLinkEmail({
        to: data.email,
        unsubscribeToken: subscription.unsubscribeToken,
      });
    } catch (err) {
      console.error("Failed to send manage link email", err);
      return { ok: false, error: "Could not send email" };
    }
  }

  return { ok: true };
}
