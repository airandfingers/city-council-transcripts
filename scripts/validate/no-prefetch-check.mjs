#!/usr/bin/env node

/**
 * FIX-ISR-PREFETCH-001: every <Link> under app/ sets prefetch={false}.
 *
 * Vercel meters ISR reads in 8 KB units, and a default <Link> fetches the
 * linked page's full RSC payload as soon as it scrolls into view. The home
 * page's city cards alone pulled ~1.2 MB (Monterey Park's city page RSC is
 * ~600 KB) on every visit, crawler or person, before anyone clicked. A click
 * still fetches the page once; only the speculative reads go away.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function* tsxFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* tsxFiles(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

const offenders = [];
for (const file of tsxFiles("app")) {
  const source = readFileSync(file, "utf8");
  // The opening tag runs to the first ">" that isn't inside a {…} expression.
  for (const match of source.matchAll(/<Link\b/g)) {
    let depth = 0;
    let end = match.index;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    const tag = source.slice(match.index, end);
    if (!/\bprefetch=\{false\}/.test(tag)) {
      const line = source.slice(0, match.index).split("\n").length;
      offenders.push(`${file}:${line}`);
    }
  }
  if (/\brouter\.prefetch\(/.test(source)) offenders.push(`${file}: router.prefetch()`);
}

if (offenders.length > 0) {
  console.error("Links that prefetch (add prefetch={false}; see FIX-ISR-PREFETCH-001):");
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
console.log("  ok   every <Link> under app/ sets prefetch={false}");
