import prisma from "@/app/lib/prisma";

/**
 * Shared auth check for every /api/cron/* endpoint.
 *
 * TEMPORARY (2026-07-09): nobody currently has Vercel dashboard access to
 * set CRON_SECRET, so Vercel Cron can't be relied on yet (it only sends an
 * Authorization header at all when CRON_SECRET is configured on the
 * project). Until then, a GitHub Actions scheduled workflow drives the
 * scheduled drains instead, authenticating with a token stored in the
 * CronAuthToken table (seeded via scripts/seed-cron-auth-token.mjs against
 * the same Neon DB prod uses). These endpoints never accept unauthenticated
 * requests — Vercel's own built-in cron will just 401 harmlessly until
 * CRON_SECRET is set.
 *
 * Once CRON_SECRET is set on Vercel: delete the CronAuthToken model + its
 * migration, this DB-lookup branch, the GH Actions workflow(s), and the
 * CronAuthToken row(s).
 */
export async function isCronAuthorized(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const expected = process.env.CRON_SECRET;
  if (expected && token === expected) return true;

  const dbToken = await prisma.cronAuthToken.findUnique({ where: { token } });
  return dbToken != null;
}
