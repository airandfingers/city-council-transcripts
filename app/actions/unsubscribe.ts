"use server";

import prisma from "@/app/lib/prisma";

export type UnsubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

export async function unsubscribe(
  unsubscribeToken: string,
  subscriptionId: number,
): Promise<UnsubscribeResult> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      unsubscribeToken: true,
      subscriber: { select: { id: true, subscriptions: { select: { unsubscribeToken: true } } } },
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
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  return { ok: true };
}
