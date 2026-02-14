#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

console.log('[lint-check] Running npm run lint...');

const result = spawnSync('npm', ['run', 'lint'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.signal) {
  console.error(`[lint-check] FAIL: terminated by signal ${result.signal}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[lint-check] FAIL (exit code ${result.status})`);
  process.exit(result.status ?? 1);
}

console.log('[lint-check] PASS');
process.exit(0);
