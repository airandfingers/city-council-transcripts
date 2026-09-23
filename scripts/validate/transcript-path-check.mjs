#!/usr/bin/env node

/**
 * Validates transcriptPath/resolveTranscriptSlug (app/lib/transcriptPath.ts):
 * canonical URLs never redirect (a wrong answer here is a redirect loop on
 * every transcript page), and every redirect target is itself canonical.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/transcript-path-check.impl.ts"], {
  stdio: "inherit",
});

process.exit(r.status ?? 1);
