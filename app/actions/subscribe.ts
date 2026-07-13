"use server";

import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { generateToken } from "@/app/lib/tokens";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { sendConfirmationEmail, sendAdminCityRequestEmail } from "@/app/lib/email";

const SubscribeInput = z
  .object({
    email: z.string().email().max(320).transform((v) => v.trim().toLowerCase()),
    kind: z.enum([
      "SITE_UPDATES",
      "CITY_COVERAGE_REQUEST",
      "CITY_UPDATES",
      "TOPIC_IN_CITY_UPDATES",
      "TOPIC_IN_CITY_COVERAGE_REQUEST",
    ]),
    cityId: z.number().int().positive().optional(),
    requestedCityName: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional(),
    interestAreaId: z.number().int().positive().optional(),
    requestedTopicName: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional(),
    // Only meaningful for CITY_UPDATES / TOPIC_IN_CITY_UPDATES — ignored
    // (defaults to INSTANT) for one-off coverage requests and site updates.
    frequency: z.enum(["INSTANT", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
    honeypot: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "CITY_UPDATES" && !val.cityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cityId is required for CITY_UPDATES",
        path: ["cityId"],
      });
    }
    if (val.kind === "CITY_COVERAGE_REQUEST" && !val.requestedCityName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requestedCityName is required for CITY_COVERAGE_REQUEST",
        path: ["requestedCityName"],
      });
    }
    if (val.kind === "TOPIC_IN_CITY_UPDATES") {
      if (!val.cityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cityId is required for TOPIC_IN_CITY_UPDATES",
          path: ["cityId"],
        });
      }
      if (!val.interestAreaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "interestAreaId is required for TOPIC_IN_CITY_UPDATES",
          path: ["interestAreaId"],
        });
      }
    }
    if (val.kind === "TOPIC_IN_CITY_COVERAGE_REQUEST") {
      if (!val.cityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cityId is required for TOPIC_IN_CITY_COVERAGE_REQUEST",
          path: ["cityId"],
        });
      }
      if (!val.requestedTopicName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "requestedTopicName is required for TOPIC_IN_CITY_COVERAGE_REQUEST",
          path: ["requestedTopicName"],
        });
      }
    }
  });

export type SubscribeInputType = z.input<typeof SubscribeInput>;
export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

function describeKind(
  kind:
    | "SITE_UPDATES"
    | "CITY_COVERAGE_REQUEST"
    | "CITY_UPDATES"
    | "TOPIC_IN_CITY_UPDATES"
    | "TOPIC_IN_CITY_COVERAGE_REQUEST",
  cityName: string | null,
  requestedCityName: string | null,
  topicName: string | null,
  requestedTopicName: string | null,
): string {
  switch (kind) {
    case "SITE_UPDATES":
      return "general site updates";
    case "CITY_UPDATES":
      return cityName ? `updates for ${cityName}` : "updates for the selected city";
    case "CITY_COVERAGE_REQUEST":
      return requestedCityName
        ? `a coverage request for ${requestedCityName}`
        : "a coverage request";
    case "TOPIC_IN_CITY_UPDATES":
      return topicName && cityName
        ? `updates about "${topicName}" in ${cityName}`
        : "updates about a topic in the selected city";
    case "TOPIC_IN_CITY_COVERAGE_REQUEST":
      return requestedTopicName && cityName
        ? `a coverage request for "${requestedTopicName}" in ${cityName}`
        : "a topic coverage request";
  }
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function subscribe(input: SubscribeInputType): Promise<SubscribeResult> {
  const parsed = SubscribeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }
  const data = parsed.data;

  if (data.honeypot && data.honeypot.length > 0) {
    return { ok: true };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`subscribe:${ip}`)) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  const cityId =
    data.kind === "CITY_UPDATES" ||
    data.kind === "TOPIC_IN_CITY_UPDATES" ||
    data.kind === "TOPIC_IN_CITY_COVERAGE_REQUEST"
      ? data.cityId!
      : null;
  const requestedCityName =
    data.kind === "CITY_COVERAGE_REQUEST" ? data.requestedCityName! : null;
  const interestAreaId =
    data.kind === "TOPIC_IN_CITY_UPDATES" ? data.interestAreaId! : null;
  const requestedTopicName =
    data.kind === "TOPIC_IN_CITY_COVERAGE_REQUEST" ? data.requestedTopicName! : null;
  const frequency =
    data.kind === "CITY_UPDATES" || data.kind === "TOPIC_IN_CITY_UPDATES"
      ? (data.frequency ?? "INSTANT")
      : "INSTANT";

  let cityName: string | null = null;
  if (cityId !== null) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: { name: true },
    });
    if (!city) {
      return { ok: false, error: "Unknown city" };
    }
    cityName = city.name;
  }

  let topicName: string | null = null;
  if (interestAreaId !== null) {
    const area = await prisma.interestArea.findUnique({
      where: { id: interestAreaId },
      select: { name: true, cityId: true },
    });
    if (!area || area.cityId !== cityId) {
      return { ok: false, error: "Unknown topic" };
    }
    topicName = area.name;
  }

  const subscriber = await prisma.subscriber.upsert({
    where: { email: data.email },
    create: { email: data.email },
    update: {},
  });

  const existing = await prisma.subscription.findFirst({
    where: {
      subscriberId: subscriber.id,
      kind: data.kind,
      cityId,
      requestedCityName,
      interestAreaId,
      requestedTopicName,
    },
  });

  let confirmToken: string;
  let unsubscribeToken: string;
  let status: "PENDING" | "ACTIVE" | "UNSUBSCRIBED";

  if (!existing) {
    confirmToken = generateToken();
    unsubscribeToken = generateToken();
    await prisma.subscription.create({
      data: {
        subscriberId: subscriber.id,
        kind: data.kind,
        cityId,
        requestedCityName,
        interestAreaId,
        requestedTopicName,
        frequency,
        status: "PENDING",
        confirmToken,
        unsubscribeToken,
      },
    });
    status = "PENDING";
  } else if (existing.status === "UNSUBSCRIBED") {
    confirmToken = generateToken();
    unsubscribeToken = generateToken();
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        confirmToken,
        unsubscribeToken,
        confirmedAt: null,
        unsubscribedAt: null,
        frequency,
      },
    });
    status = "PENDING";
  } else {
    confirmToken = existing.confirmToken;
    unsubscribeToken = existing.unsubscribeToken;
    status = existing.status as "PENDING" | "ACTIVE";
    // Resubmitting an active/pending subscription (e.g. changing frequency
    // from the subscribe form) updates the frequency in place.
    if (data.frequency && data.frequency !== existing.frequency) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { frequency: data.frequency },
      });
    }
  }

  // Notify admins of every city request, even repeat submissions.
  if (data.kind === "CITY_COVERAGE_REQUEST") {
    const adminSubscribers = await prisma.subscriber.findMany({
      where: { isAdmin: true },
      select: { email: true },
    });
    void sendAdminCityRequestEmail({
      requesterEmail: data.email,
      requestedCityName: requestedCityName!,
      adminEmails: adminSubscribers.map((s) => s.email),
    });
  }

  if (status === "PENDING") {
    try {
      await sendConfirmationEmail({
        to: data.email,
        confirmToken,
        unsubscribeToken,
        description: describeKind(
          data.kind,
          cityName,
          requestedCityName,
          topicName,
          requestedTopicName,
        ),
      });
    } catch (err) {
      console.error("Failed to send confirmation email", err);
      return { ok: false, error: "Could not send confirmation email" };
    }
  }

  return { ok: true };
}
