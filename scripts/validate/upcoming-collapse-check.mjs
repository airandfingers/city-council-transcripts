#!/usr/bin/env node

/**
 * Validates app/lib/upcoming.ts (FIX-UPCOMING-NEXT-REGULAR-001): the city
 * page's collapsed Upcoming group always includes the next regular council
 * meeting, even when a special meeting or commission meeting comes first.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/upcoming-collapse-check.impl.ts"], { stdio: "inherit" });

process.exit(r.status ?? 1);
