/**
 * Fallback host/address used only when the corresponding env var isn't set.
 *
 * FIX-STALE-SITE-URL-DOMAIN-001: robots.ts, sitemap.ts, and
 * transcripts/[...slug]/page.tsx each hardcoded their own
 * `transcripts.ayoshitake.com` fallback — the site's previous domain. None
 * of these fallbacks are believed to actually fire in production today
 * (NEXT_PUBLIC_SITE_URL / EMAIL_FROM are set, just to the old domain — see
 * that story for the real fix, which is an env var change + redeploy, not
 * this file). But a wrong default is still wrong: if either var were ever
 * cleared, these would silently resurrect the retired host instead of
 * failing loudly or pointing somewhere current. Centralized here so there's
 * one value to update, not three.
 *
 * Unlike `app/lib/email.ts`'s `getSiteUrl()`, which throws when
 * NEXT_PUBLIC_SITE_URL is unset, robots.ts/sitemap.ts cannot throw — they
 * must always render something for crawlers, so a real (if not env-driven)
 * default is the right shape here.
 *
 * FIX-STALE-SITE-URL-STILL-LIVE-001 (2026-08-29): the old domain was still
 * appearing in production digest emails, because NEXT_PUBLIC_SITE_URL is
 * build-time inlined — a Vercel dashboard env var update alone does nothing
 * until the next deploy. This comment-only change exists to trigger that
 * deploy once the dashboard value is corrected.
 */
export const FALLBACK_SITE_URL = "https://counciloris.com";

/** Mirrors FALLBACK_SITE_URL's rationale, for the admin-contact-email fallback
 * in transcripts/[...slug]/page.tsx (SUMMARY_REQUEST_EMAIL). */
export const FALLBACK_ADMIN_EMAIL = "info@counciloris.com";
