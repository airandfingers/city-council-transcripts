import { NextResponse, type NextRequest } from "next/server";
import { canonicalEncodedPath } from "@/app/lib/canonicalPath";

/**
 * Redirect percent-encoded spellings of unreserved characters (`%2D` → `-`,
 * `%5F` → `_`, …) to the canonical URL before any page renders, so every
 * spelling lands on the one cached page instead of rendering from Neon on
 * each request. No DB access here — this runs before routing. See
 * app/lib/canonicalPath.ts for the rule and why it is always safe.
 */
export function proxy(request: NextRequest) {
  const canonical = canonicalEncodedPath(request.nextUrl.pathname);
  if (canonical === null) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = canonical;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Pages only: skip build assets, images, API routes and files with an extension.
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
