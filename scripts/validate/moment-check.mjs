#!/usr/bin/env node

/**
 * Validates app/lib/moment.ts (MomentCard selection, FEAT-MOMENT-CARD-001):
 * innermost agenda item at ?t=, topic pages covering t, key-point parsing.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/moment-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
