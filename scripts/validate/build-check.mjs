#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

console.log('[build-check] Running npm run build...');

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.signal) {
  console.error(`[build-check] FAIL: terminated by signal ${result.signal}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[build-check] FAIL (exit code ${result.status})`);
  process.exit(result.status ?? 1);
}

console.log('[build-check] PASS');
process.exit(0);
