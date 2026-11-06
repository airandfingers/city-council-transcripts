#!/usr/bin/env node

/**
 * Validates lazy-loaded meeting content
 * (FIX-TRANSCRIPT-LAZY-LOAD-001 and related);
 * see the .impl.ts header.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/lazy-content-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
