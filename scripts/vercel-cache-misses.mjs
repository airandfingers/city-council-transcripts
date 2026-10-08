#!/usr/bin/env node

/**
 * Pulls production request logs from Vercel and reports which requests missed
 * the cache — i.e. which ones could have woken Neon.
 *
 * WHY (FIX-NEON-CACHE-MISS-LOGS-001): Neon's free plan bills every wake for at
 * least 5 minutes, so each serverless request that misses the cache and touches
 * the DB costs ~5 min of compute. Since Oct 1 the transcriber only touches Neon
 * once a day, yet compute is still 9-13 active h/day, so the remaining wakes
 * come from site traffic. Production lives under the airandfingers Vercel team,
 * so this is meant to be run by someone on that team.
 *
 * Vercel keeps request logs only briefly (about 1h on Hobby, longer on Pro), so
 * each run appends to a local JSONL file and dedupes by log id. Run --watch for
 * a day to build up a full picture, then send OUT (default
 * .vercel-logs/requests.jsonl) back, or just paste the --report output.
 *
 * Walkthrough for whoever runs it: docs/vercel-cache-miss-logs.md
 *
 * Usage:
 *   vercel login                                    # once, as an airandfingers member
 *   node scripts/vercel-cache-misses.mjs            # fetch recent logs, append, report
 *   node scripts/vercel-cache-misses.mjs --watch    # fetch every 20 min until Ctrl-C
 *   node scripts/vercel-cache-misses.mjs --report   # report on the saved file only
 *
 * Env overrides: VERCEL_SCOPE (default airandfingers), VERCEL_PROJECT (default
 * city-council-transcripts), SINCE (default 2h), LIMIT (default 10000),
 * WATCH_MINUTES (default 20), OUT.
 */

import { execFile } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const SCOPE = process.env.VERCEL_SCOPE || "airandfingers";
const PROJECT = process.env.VERCEL_PROJECT || "city-council-transcripts";
const SINCE = process.env.SINCE || "2h";
const LIMIT = Number(process.env.LIMIT || 10000);
const WATCH_MINUTES = Number(process.env.WATCH_MINUTES || 20);
const OUT = process.env.OUT || ".vercel-logs/requests.jsonl";

const args = new Set(process.argv.slice(2));

function loadSaved() {
  if (!existsSync(OUT)) return [];
  return readFileSync(OUT, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l));
}

async function fetchLogs() {
  const cliArgs = [
    "logs",
    "--project", PROJECT,
    "--scope", SCOPE,
    "--environment", "production",
    "--since", SINCE,
    "--limit", String(LIMIT),
    "--json",
    "--non-interactive",
  ];
  let stdout;
  try {
    ({ stdout } = await run("vercel", cliArgs, { maxBuffer: 512 * 1024 * 1024 }));
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("The Vercel CLI isn't installed. Run: npm i -g vercel, then vercel login");
    } else {
      console.error(`vercel logs failed (scope=${SCOPE}, project=${PROJECT}):\n${err.stderr || err.message}`);
      console.error("Check `vercel whoami` and `vercel teams ls`; set VERCEL_SCOPE / VERCEL_PROJECT if the names differ.");
    }
    process.exit(1);
  }
  const fetched = stdout
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l));

  const seen = new Set(loadSaved().map((r) => r.id));
  const fresh = fetched.filter((r) => !seen.has(r.id));
  if (fresh.length) {
    mkdirSync(dirname(OUT), { recursive: true });
    appendFileSync(OUT, fresh.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  const note = fetched.length >= LIMIT ? `  !! hit LIMIT=${LIMIT}; raise it or shorten SINCE` : "";
  console.log(`[${new Date().toISOString()}] fetched ${fetched.length}, ${fresh.length} new -> ${OUT}${note}`);
}

// Collapse concrete URLs to their Next.js route so misses group sensibly.
function route(path) {
  const p = path.split("?")[0];
  if (p.startsWith("/_next/")) return "/_next/*";
  if (p.startsWith("/api/")) return p.replace(/\/[0-9a-f-]{8,}(?=\/|$)/gi, "/[id]");
  if (p.startsWith("/transcripts/")) return "/transcripts/[...slug]";
  if (p.startsWith("/confirm/")) return "/confirm/[token]";
  const parts = p.split("/").filter(Boolean);
  const fixed = new Set(["glossary", "methodology", "subscriptions", "admin", "sitemap.xml", "robots.txt"]);
  if (parts.length === 0 || fixed.has(parts[0])) return p;
  if (parts.length === 2) return "/[state]/[city]";
  if (parts.length === 3 && parts[2] === "topics") return "/[state]/[city]/topics";
  if (parts.length === 4 && parts[2] === "topics") return "/[state]/[city]/topics/[slug]";
  return `(other) ${p}`;
}

// URL spellings that bypass the cached canonical page.
function oddities(path) {
  const flags = [];
  if (path.includes("?")) flags.push("query");
  if (/%[0-9a-f]{2}/i.test(path)) flags.push("encoded");
  if (/[A-Z]/.test(path.split("?")[0].replace(/%[0-9a-f]{2}/gi, ""))) flags.push("uppercase");
  if (path.length > 1 && path.split("?")[0].endsWith("/")) flags.push("trailing-slash");
  return flags;
}

function table(rows, limit = 25) {
  for (const [k, v] of rows.slice(0, limit)) console.log(`  ${String(v).padStart(6)}  ${k}`);
  if (rows.length > limit) console.log(`  ... ${rows.length - limit} more`);
}

function countBy(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function report() {
  const all = loadSaved();
  if (!all.length) {
    console.log(`No saved logs in ${OUT} yet.`);
    return;
  }
  const ts = all.map((r) => r.timestamp);
  const fmt = (t) => new Date(t).toISOString().replace(".000", "");
  console.log(`\n${all.length} requests, ${fmt(Math.min(...ts))} -> ${fmt(Math.max(...ts))} (UTC)`);

  console.log("\nBy source / cache:");
  table(countBy(all, (r) => `${r.source} ${r.cache || "(none)"}`));

  // Static assets never touch the DB; a serverless request without a cache HIT
  // is the candidate Neon wake.
  const misses = all.filter((r) => r.source !== "static" && r.cache !== "HIT");
  console.log(`\nServerless requests without a cache HIT (possible Neon wakes): ${misses.length}`);

  console.log("\n  by route:");
  table(countBy(misses, (r) => route(r.requestPath)));
  console.log("\n  by status code:");
  table(countBy(misses, (r) => `${r.responseStatusCode} ${r.cache || "(none)"}${r.cacheReason ? ` (${r.cacheReason})` : ""}`));
  console.log("\n  odd URL spellings:");
  table(countBy(misses.filter((r) => oddities(r.requestPath).length), (r) => oddities(r.requestPath).join("+")));
  console.log("\n  top paths:");
  table(countBy(misses, (r) => `${r.responseStatusCode}  ${r.requestPath}`), 40);

  // Line this up with `neon_usage.py --activity` (UTC) to see which misses
  // started a wake.
  console.log("\n  per hour (UTC):");
  table(
    countBy(misses, (r) => new Date(r.timestamp).toISOString().slice(0, 13) + ":00").sort((a, b) =>
      a[0].localeCompare(b[0]),
    ),
    48,
  );
}

if (args.has("--report")) {
  report();
} else if (args.has("--watch")) {
  console.log(`Fetching every ${WATCH_MINUTES} min; Ctrl-C to stop, then run with --report.`);
  for (;;) {
    await fetchLogs();
    await new Promise((r) => setTimeout(r, WATCH_MINUTES * 60 * 1000));
  }
} else {
  await fetchLogs();
  report();
}
