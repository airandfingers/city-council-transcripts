import { NextResponse } from "next/server";
import { getCitiesForNav } from "@/app/lib/cityData";

/**
 * City list for SiteHeader's client-side city switcher.
 *
 * Deliberately `force-dynamic` (never statically generated at build time) —
 * this codebase's static/ISR pages are built with `generateStaticParams()`
 * returning `[]` specifically so `next build` never needs a reachable DB
 * (see the generateStaticParams comment in app/transcripts/[...slug]/
 * page.tsx and the FIX-NEON-EGRESS-* stories in city-council-transcriber's
 * prd.md). SiteHeader renders in the root layout on every page, so if this
 * route (or a direct DB call from the layout) were statically prerendered,
 * it would make the *entire site's* build depend on DB reachability —
 * tried that first, broke `next build` with no local Postgres running.
 * Fetched client-side (not server-rendered into the layout) for the same
 * reason: an async root layout would force every page through the same
 * build-time DB dependency.
 *
 * getCitiesForNav() itself is `unstable_cache`'d (1h), so this route is
 * cheap per-request despite being dynamic — only the first request per
 * cache window actually hits Neon.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const cities = await getCitiesForNav();
  return NextResponse.json({ cities });
}
