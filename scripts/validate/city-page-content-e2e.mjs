#!/usr/bin/env node

/**
 * City page content E2E validation
 *
 * Validates:
 * - City routes render correctly (/ca/monterey-park, /co/fort-collins)
 * - City page content (title, summary, meeting cards)
 * - Meeting cards with transcript links
 *
 * NOTE: This is a POC placeholder that uses HTTP requests to verify basic content.
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
  console.log('[city-e2e] Starting Next.js server...');

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
      console.error('[city-e2e] Server failed to start');
      console.error(serverOutput);
      process.exit(1);
    }

    console.log('[city-e2e] Server ready, validating city pages...');

    // Test Monterey Park page
    const mpPage = await fetchPage(`http://localhost:${PORT}/ca/monterey-park`);
    if (mpPage.status !== 200) {
      console.error(`[city-e2e] FAIL: /ca/monterey-park returned ${mpPage.status}`);
      process.exit(1);
    }
    if (!mpPage.body.includes('Monterey Park')) {
      console.error('[city-e2e] FAIL: /ca/monterey-park missing city name');
      process.exit(1);
    }
    if (!mpPage.body.includes('California') && !mpPage.body.includes('CA')) {
      console.error('[city-e2e] FAIL: /ca/monterey-park missing state');
      process.exit(1);
    }
    if (!mpPage.body.includes('Meeting') && !mpPage.body.includes('meeting')) {
      console.error('[city-e2e] FAIL: /ca/monterey-park missing meeting content');
      process.exit(1);
    }
    console.log('[city-e2e] /ca/monterey-park OK');

    // Test Fort Collins page
    const fcPage = await fetchPage(`http://localhost:${PORT}/co/fort-collins`);
    if (fcPage.status !== 200) {
      console.error(`[city-e2e] FAIL: /co/fort-collins returned ${fcPage.status}`);
      process.exit(1);
    }
    if (!fcPage.body.includes('Fort Collins')) {
      console.error('[city-e2e] FAIL: /co/fort-collins missing city name');
      process.exit(1);
    }
    if (!fcPage.body.includes('Colorado') && !fcPage.body.includes('CO')) {
      console.error('[city-e2e] FAIL: /co/fort-collins missing state');
      process.exit(1);
    }
    if (!fcPage.body.includes('Meeting') && !fcPage.body.includes('meeting')) {
      console.error('[city-e2e] FAIL: /co/fort-collins missing meeting content');
      process.exit(1);
    }
    console.log('[city-e2e] /co/fort-collins OK');

    console.log('[city-e2e] PASS');
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
  console.error('[city-e2e] FAIL:', err.message);
  process.exit(1);
});
