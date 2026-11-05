#!/usr/bin/env node

/**
 * Validates app/lib/upcoming.ts's meeting-day rules
 * (FIX-UPCOMING-PAST-DAY-001) and app/lib/granicus.ts's embed URLs
 * (FIX-GRANICUS-EMBED-SEEK-001).
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/meeting-day-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
