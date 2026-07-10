import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { publishDueScheduledAlerts } from "@/app/lib/alerts";

/**
 * GET /api/cron/publish-scheduled
 *
 * Auth: Authorization: Bearer <CRON_SECRET | a CronAuthToken.token row>
 *
 * Scheduled drain (Vercel Cron): publishes every alert whose hold window has
 * elapsed (`scheduledFor <= now`, still SENT_TO_ADMINS) to its end-user
 * subscribers, reusing the stage-2 pipeline (publishAlertToSubscribers).
 * Frequency-agnostic — it releases everything currently due, so the cron
 * cadence is just a knob. Vercel Cron issues GET and injects the bearer
 * token automatically when CRON_SECRET is configured on the Vercel project.
 */
export const dynamic = "force-dynamic";

/**
 * TEMPORARY (2026-07-09): nobody currently has Vercel dashboard access to
 * set CRON_SECRET, so Vercel Cron can't be relied on yet (it only sends an
 * Authorization header at all when CRON_SECRET is configured on the
 * project). Until then, a GitHub Actions scheduled workflow drives the
 * daily drain instead, authenticating with a token stored in the
 * CronAuthToken table (seeded via scripts/seed-cron-auth-token.mjs against
 * the same Neon DB prod uses). The endpoint never accepts unauthenticated
 * requests — Vercel's own built-in cron will just 401 harmlessly until
 * CRON_SECRET is set.
 *
 * Once CRON_SECRET is set on Vercel: delete the CronAuthToken model + its
 * migration, this DB-lookup branch, the GH Actions workflow
 * (.github/workflows/publish-scheduled.yml), and the CronAuthToken row(s).
 */
async function isAuthorized(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const expected = process.env.CRON_SECRET;
  if (expected && token === expected) return true;

  const dbToken = await prisma.cronAuthToken.findUnique({ where: { token } });
  return dbToken != null;
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueScheduledAlerts();
  return NextResponse.json({ ok: true, ...result });
}
