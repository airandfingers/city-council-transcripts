#!/usr/bin/env node

/**
 * Warms the ISR/data cache by requesting every URL in the sitemap.
 *
 * WHY (FIX-NEON-HTTP-ADAPTER-001 follow-up): a deploy invalidates the whole
 * page cache, so every page's next visitor triggers a cold render — and a cold
 * transcript page runs the heaviest query in the app. Left to organic/crawler
 * traffic that re-warming dribbles out over many hours, keeping Neon's compute
 * awake the whole time (measured 2026-09-22: 41% of pages still cold 6.5h after
 * a deploy, with compute ~82% active). Doing it deliberately compresses that
 * into ~75 seconds.
 *
 * It is also outage insurance. Neon's free plan suspends compute when the
 * monthly CU-hour allowance runs out; verified by test, an already-cached page
 * still serves 200 with no database, while a never-rendered page returns 500.
 * A warm cache means the site survives a suspension.
 *
 * Usage:
 *   node scripts/warm-cache.mjs                     # defaults to SITE_URL/NEXT_PUBLIC_SITE_URL
 *   node scripts/warm-cache.mjs https://example.com # explicit origin
 *   CONCURRENCY=8 node scripts/warm-cache.mjs
 */

const origin = (
  process.argv[2] ||
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://counciloris.com"
).replace(/\/$/, "");

const CONCURRENCY = Number(process.env.CONCURRENCY || 5);
// A cold render is ~1-2s; anything above this is counted as "was cold".
const COLD_MS = Number(process.env.COLD_MS || 800);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30000);

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

async function main() {
  console.log(`[warm] origin: ${origin}`);
  let xml;
  try {
    xml = await fetchText(`${origin}/sitemap.xml`);
  } catch (err) {
    console.error(`[warm] could not fetch sitemap: ${err.message}`);
    process.exit(1);
  }

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) {
    console.error("[warm] sitemap contained no <loc> entries");
    process.exit(1);
  }
  console.log(`[warm] ${urls.length} URLs, concurrency ${CONCURRENCY}`);

  const started = Date.now();
  let done = 0, cold = 0, failed = 0;
  const queue = urls.slice();

  async function worker() {
    for (;;) {
      const url = queue.pop();
      if (!url) return;
      const t0 = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const ms = Date.now() - t0;
        if (!res.ok) {
          failed++;
          console.log(`[warm]   ${res.status} ${url}`);
        } else if (ms > COLD_MS) {
          cold++;
        }
      } catch (err) {
        failed++;
        console.log(`[warm]   ERR ${url} — ${err.message}`);
      }
      done++;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `[warm] done in ${secs}s — ${done} requested, ${cold} were cold (${Math.round((100 * cold) / done)}%), ${failed} failed`,
  );

  // Failures are reported but don't fail the job: warming is best-effort, and a
  // handful of slow/errored pages shouldn't mark a good deploy as broken. A
  // wholesale failure (nothing succeeded) is worth surfacing, though.
  if (failed === done) {
    console.error("[warm] every request failed — treating as an error");
    process.exit(1);
  }
}

main();
