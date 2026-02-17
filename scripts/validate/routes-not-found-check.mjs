#!/usr/bin/env node

/**
 * 404 route validation
 *
 * Delegates to Python Playwright E2E tests:
 * - Unknown routes return 404
 * - Invalid city routes return 404
 * - Invalid state routes return 404
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const label = '[404-check]';

// Use venv Python if available (has playwright installed)
const venvPython = '.venv/bin/python3';
const python = existsSync(venvPython) ? venvPython : 'python3';

console.log(`${label} Running 404 route E2E tests via Playwright...`);

const result = spawnSync(
  python,
  [
    'skills/webapp-testing/scripts/with_server.py',
    '--server', 'npm run dev',
    '--port', '3000',
    '--',
    python, 'skills/webapp-testing/not_found_test.py',
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
