#!/usr/bin/env node

/**
 * FIX-NEON-COMPUTE-CACHING-001: verifies the search-corpus matcher is
 * behavior-identical to the pre-refactor loop and that both cached values
 * (search corpus, sitemap catalog) survive `unstable_cache`'s JSON round
 * trip. Run via `tsx` since the modules under test are TypeScript.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync(
  "npx",
  ["tsx", "scripts/validate/cache-boundary-check.impl.ts"],
  { stdio: "inherit" },
);

process.exit(r.status ?? 1);
