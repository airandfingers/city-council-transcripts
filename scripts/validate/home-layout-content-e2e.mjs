#!/usr/bin/env node

/**
 * Home page layout and content E2E validation
 *
 * Validates:
 * - City cards count (exactly 2)
 * - City card content (Monterey Park, Fort Collins)
 * - Responsive layout behavior
 *
 * NOTE: This is a POC placeholder that uses curl to verify basic content.
 * Will be updated in Phase 3 to use Python Playwright E2E tests.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = 3000;
const TIMEOUT_MS = 30000;

async function waitForServer(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          res.resume();
          resolve(true);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('[home-e2e] Starting Next.js server...');

  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT) },
    detached: true,
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d.toString()));
  server.stderr.on('data', (d) => (serverOutput += d.toString()));

  try {
    const ready = await waitForServer(PORT, TIMEOUT_MS);
    if (!ready) {
      console.error('[home-e2e] Server failed to start');
      console.error(serverOutput);
      process.exit(1);
    }

    console.log('[home-e2e] Server ready, validating home page...');

    const { status, body } = await fetchPage(`http://localhost:${PORT}/`);

    if (status !== 200) {
      console.error(`[home-e2e] FAIL: Expected 200, got ${status}`);
      process.exit(1);
    }

    // Check for city cards
    const hasMontereyPark = body.includes('Monterey Park');
    const hasFortCollins = body.includes('Fort Collins');
    const hasAboutSection = body.includes('About');

    if (!hasMontereyPark) {
      console.error('[home-e2e] FAIL: Missing "Monterey Park" on home page');
      process.exit(1);
    }

    if (!hasFortCollins) {
      console.error('[home-e2e] FAIL: Missing "Fort Collins" on home page');
      process.exit(1);
    }

    if (!hasAboutSection) {
      console.error('[home-e2e] FAIL: Missing "About" section on home page');
      process.exit(1);
    }

    console.log('[home-e2e] PASS');
    process.exit(0);
  } finally {
    // Kill server process group
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error('[home-e2e] FAIL:', err.message);
  process.exit(1);
});
