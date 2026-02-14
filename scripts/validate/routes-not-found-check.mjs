#!/usr/bin/env node

/**
 * 404 route validation
 *
 * Validates:
 * - Unknown routes return 404
 * - Invalid city routes return 404
 * - Invalid state routes return 404
 *
 * NOTE: This is a POC placeholder that uses HTTP requests to verify 404 behavior.
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
  console.log('[404-check] Starting Next.js server...');

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
      console.error('[404-check] Server failed to start');
      console.error(serverOutput);
      process.exit(1);
    }

    console.log('[404-check] Server ready, validating 404 routes...');

    const testRoutes = [
      { path: '/invalid/route', desc: 'completely invalid route' },
      { path: '/ca/invalid-city', desc: 'invalid city for valid state' },
      { path: '/xx/monterey-park', desc: 'invalid state for valid city' },
    ];

    for (const { path, desc } of testRoutes) {
      const { status } = await fetchPage(`http://localhost:${PORT}${path}`);
      if (status !== 404) {
        console.error(`[404-check] FAIL: ${path} (${desc}) returned ${status}, expected 404`);
        process.exit(1);
      }
      console.log(`[404-check] ${path} -> 404 OK`);
    }

    console.log('[404-check] PASS');
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
  console.error('[404-check] FAIL:', err.message);
  process.exit(1);
});
