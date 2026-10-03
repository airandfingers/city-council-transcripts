#!/usr/bin/env node

/**
 * Validates canonicalEncodedPath (app/lib/canonicalPath.ts), used by proxy.ts:
 * canonical paths never redirect (a wrong answer is a redirect loop), and
 * percent-encoded unreserved characters redirect to a canonical, fixed-point
 * spelling. INVESTIGATE-NEON-STRAY-WAKES-001.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/encoded-path-check.impl.ts"], {
  stdio: "inherit",
});

process.exit(r.status ?? 1);
