#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function usage(exitCode = 0) {
  console.log(`Usage:
  node scripts/validate/run-gates.mjs --all
  node scripts/validate/run-gates.mjs --id <gate-id>

Reads: scripts/validate/gates.json
Exits: 0 on success, nonzero on first failing gate
`);
  process.exit(exitCode);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);

const wantAll = args.includes('--all');
const idIndex = args.indexOf('--id');
const wantId = idIndex !== -1 ? args[idIndex + 1] : undefined;

if (!wantAll && !wantId) usage(2);

const manifestPath = 'scripts/validate/gates.json';
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);
const gates = Array.isArray(manifest.gates) ? manifest.gates : [];

const selected = wantAll ? gates : gates.filter((g) => g.id === wantId);
if (selected.length === 0) {
  console.error(`[gates] No gates selected (id=${wantId ?? 'n/a'})`);
  process.exit(2);
}

for (const gate of selected) {
  if (!gate?.command || typeof gate.command !== 'string') {
    console.error(`[gates] Invalid gate command for id=${gate?.id ?? 'unknown'}`);
    process.exit(2);
  }

  console.log(`\n[gates] RUN ${gate.id}: ${gate.description ?? ''}`.trimEnd());
  console.log(`[gates] cmd: ${gate.command}`);

  // Use shell to preserve simple command strings.
  const r = spawnSync(gate.command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if (r.signal) {
    console.error(`[gates] FAIL ${gate.id}: terminated by signal ${r.signal}`);
    process.exit(1);
  }

  if (r.status !== 0) {
    console.error(`[gates] FAIL ${gate.id}: exit code ${r.status}`);
    process.exit(r.status ?? 1);
  }

  console.log(`[gates] PASS ${gate.id}`);
}

console.log('\n[gates] ALL PASS');
process.exit(0);
