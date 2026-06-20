import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * GET /api/contract
 *
 * Returns the current publisher contract (contract/schema.v1.json) as JSON.
 *
 * External publishers (e.g. city-council-transcriber) fetch this to learn
 * the current writable schema and project their data onto it before writing
 * directly to Neon. See CONTRACT.md for the versioning rules.
 *
 * - No authentication required (public schema metadata).
 * - Cached aggressively; the contract only changes after a Prisma migration
 *   followed by `npm run db:contract`.
 */
export async function GET() {
  try {
    const contractPath = resolve(process.cwd(), "contract/schema.v1.json");
    const raw = await readFile(contractPath, "utf-8");
    const contract = JSON.parse(raw);

    return NextResponse.json(contract, {
      headers: {
        // Publishers may cache for up to 1 hour; CDN/edge may cache for 24 h.
        // The contract changes rarely (only after migrations + regeneration).
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    // This should never happen in a correctly deployed app — the contract
    // file is committed alongside the code. Surface clearly if it does.
    console.error("[GET /api/contract] Failed to read contract file:", err);
    return NextResponse.json(
      { error: "Contract file unavailable. Run `npm run db:contract` to regenerate." },
      { status: 500 },
    );
  }
}
