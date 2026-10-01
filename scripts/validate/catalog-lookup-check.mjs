#!/usr/bin/env node

/**
 * Validates the catalog-first "does this exist?" checks and topic-page
 * invalidation (FIX-NEON-TOPIC-PAGES-CHEAP-404-001): unknown cities, topics
 * and meetings are answered from the cached catalog, known ones are never
 * reported missing, and the city-level /api/revalidate call reaches the
 * (now TTL-less) topic detail pages.
 */

import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "scripts/validate/catalog-lookup-check.impl.ts"], {
  stdio: "inherit",
});

process.exit(r.status ?? 1);
