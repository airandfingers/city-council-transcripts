#!/usr/bin/env node

/**
 * Validates resolveTitleAt (app/lib/roster.ts) against the Monterey Park
 * mayor-rotation fixture used as the acceptance test for FEAT-ROSTER-
 * TITLES-OVER-TIME-001: a 2025 meeting must show Mayor Yang / Mayor Pro Tem
 * Lo; a post-Jan-2026 meeting must show Mayor Lo / Mayor Pro Tem Sanchez.
 * Run via `tsx` since app/lib/roster.ts is TypeScript.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync(
  "npx",
  ["tsx", "scripts/validate/roster-title-resolver-check.impl.ts"],
  { stdio: "inherit" },
);

process.exit(r.status ?? 1);
