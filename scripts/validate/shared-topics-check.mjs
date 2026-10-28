#!/usr/bin/env node

/**
 * Validates app/lib/sharedTopics.ts (FIX-GLOBAL-TOPICS-NAV-001): interest
 * areas with the same slug in several cities become one cross-city topic.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/shared-topics-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
