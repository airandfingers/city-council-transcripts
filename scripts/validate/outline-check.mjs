#!/usr/bin/env node

/**
 * Validates app/lib/outline.ts (FEAT-MEETING-OUTLINE-001): timeline bullets
 * land under the right agenda item on real meetings of each agenda shape,
 * unmatched ones become their own lines, and no agenda falls back.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/outline-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
