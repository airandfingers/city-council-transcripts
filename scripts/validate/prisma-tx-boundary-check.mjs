#!/usr/bin/env node

/**
 * FIX-NEON-HTTP-ADAPTER-001: guards that no transaction-requiring Prisma
 * operation (upsert / createMany / updateMany / nested relation write /
 * $transaction) is called on the default HTTP-backed client, which cannot open
 * a transaction. Run via `tsx` since the check is TypeScript.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync(
  "npx",
  ["tsx", "scripts/validate/prisma-tx-boundary-check.impl.ts"],
  { stdio: "inherit" },
);

process.exit(r.status ?? 1);
