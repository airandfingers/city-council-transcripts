#!/usr/bin/env node

/**
 * Validates FIX-NEON-PER-MEETING-REFRESH-001: transcript pages don't depend on
 * the site-wide cache tags, and /api/revalidate refreshes the meetings that
 * changed.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/per-meeting-refresh-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
