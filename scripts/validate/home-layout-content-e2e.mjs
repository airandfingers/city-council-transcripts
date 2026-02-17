#!/usr/bin/env node

/**
 * Home page layout and content E2E validation
 *
 * Delegates to Python Playwright E2E tests:
 * - City cards count (exactly 2)
 * - City card content (Monterey Park, Fort Collins)
 * - About section present
 * - Navigation links work
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const label = '[home-e2e]';

// Use venv Python if available (has playwright installed)
const venvPython = '.venv/bin/python3';
const python = existsSync(venvPython) ? venvPython : 'python3';

console.log(`${label} Running home page E2E tests via Playwright...`);

const result = spawnSync(
  python,
  [
    'skills/webapp-testing/scripts/with_server.py',
    '--server', 'npm run dev',
    '--port', '3000',
    '--',
    python, 'tests/e2e/home_page_test.py',
  ],
  {
    stdio: 'inherit',
    env: process.env,
  }
);

if (result.signal) {
  console.error(`${label} FAIL: terminated by signal ${result.signal}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`${label} FAIL: exit code ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log(`${label} PASS`);
process.exit(0);
