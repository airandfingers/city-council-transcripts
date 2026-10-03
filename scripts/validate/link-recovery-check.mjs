#!/usr/bin/env node

/**
 * Validates app/lib/linkRecovery.ts (FIX-TRUNCATED-LINKS-001): cut-off
 * transcript links are de-truncated and matched against the meeting catalog.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/link-recovery-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
