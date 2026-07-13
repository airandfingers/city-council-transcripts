"use server";

import prisma from "@/app/lib/prisma";
import type { AlertFrequency } from "@prisma/client";

export type UpdateFrequencyResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_FREQUENCIES: AlertFrequency[] = ["INSTANT", "DAILY", "WEEKLY", "MONTHLY"];

/**
 * Lets a subscriber change how often they're emailed for one of their
 * subscriptions (see app/lib/alerts.ts's publishAlertToSubscribers /
 * app/lib/digest.ts for how frequency drives fan-out). Verified the same
 * way unsubscribe() is: unsubscribeToken must belong to the same subscriber
 * as the subscription being changed.
 */
export async function updateSubscriptionFrequency(
  unsubscribeToken: string,
  subscriptionId: number,
  frequency: string,
): Promise<UpdateFrequencyResult> {
  if (!VALID_FREQUENCIES.includes(frequency as AlertFrequency)) {
    return { ok: false, error: "Invalid frequency" };
  }

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      subscriber: { select: { subscriptions: { select: { unsubscribeToken: true } } } },
    },
  });
  if (!sub) return { ok: false, error: "Subscription not found" };

  const tokenMatchesSubscriber = sub.subscriber.subscriptions.some(
    (s) => s.unsubscribeToken === unsubscribeToken,
  );
  if (!tokenMatchesSubscriber) {
    return { ok: false, error: "Invalid token" };
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { frequency: frequency as AlertFrequency },
  });
  return { ok: true };
}
