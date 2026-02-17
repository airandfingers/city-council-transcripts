#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

const repoRoot = process.cwd();
const venvPython = path.join(repoRoot, '.venv', 'bin', 'python');
const python = process.env.PYTHON || (exists(venvPython) ? venvPython : 'python3');

const helper = path.join('skills', 'webapp-testing', 'scripts', 'with_server.py');
const testScript = path.join('tests', 'e2e', 'hello_world_test.py');

const args = [
  helper,
  '--server',
  'npm run dev',
  '--port',
  '3000',
  '--',
  python,
  testScript,
];

console.log(`[e2e] python: ${python}`);
console.log(`[e2e] cmd: ${python} ${args.map((a) => JSON.stringify(a)).join(' ')}`);

const child = spawn(python, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
    PWDEBUG: process.env.PWDEBUG ?? '0',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[e2e] failed: terminated by signal ${signal}`);
    process.exit(1);
  }
  if (code === 0) {
    console.log('[e2e] PASS');
    process.exit(0);
  }
  console.error(`[e2e] FAIL (exit code ${code})`);
  process.exit(code ?? 1);
});
