#!/usr/bin/env node

/**
 * TEMPORARY (2026-07-09): seeds a random CronAuthToken row so the
 * GitHub Actions scheduled drain (.github/workflows/publish-scheduled.yml)
 * can authenticate against /api/cron/publish-scheduled without needing
 * Vercel dashboard access to set CRON_SECRET. See the CronAuthToken model
 * comment in prisma/schema.prisma and the isAuthorized() comment in
 * app/api/cron/publish-scheduled/route.ts for the full removal plan.
 *
 * Usage:
 *   node scripts/seed-cron-auth-token.mjs
 *
 * Run this against whichever DATABASE_URL/DIRECT_URL is active in your
 * .env — for this to work in prod, that must be the SAME Neon DB prod
 * reads from. Prints the generated token once; it is not shown again.
 * Copy it into `gh secret set CRON_TEMP_TOKEN` for the GH Actions workflow.
 */

import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const token = crypto.randomBytes(32).toString("hex");
  const row = await prisma.cronAuthToken.create({
    data: { token, label: "github-actions-temp-drain" },
  });

  console.log(`Created CronAuthToken id=${row.id}`);
  console.log(`Token (copy this now, it will not be shown again):\n${token}`);
  console.log(
    `\nNext: gh secret set CRON_TEMP_TOKEN --body "${token}" --repo <owner>/<repo>`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
