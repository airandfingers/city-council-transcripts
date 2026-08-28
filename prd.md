# Product Requirements

## Implementation Status Summary

- ✅ FIX-STALE-SITE-URL-DOMAIN-001 — Stale `transcripts.ayoshitake.com` fallbacks + repeated/mislabeled "agenda fetch looks stuck" digest alert
- ✅ US-LOCALDB-001 — Local Postgres for development
- ✅ FIX-ALERT-AGEGATE-NULLMEETING-001 — Age-gate interest-area alerts with no meetingId
- ✅ FEAT-ADMIN-DIGEST-ALWAYS-001 — Route all automated admin alerts through the daily digest only
- ✅ FIX-ALERT-DEDUP-001 — Dedup repeat createMeetingUpdateAlert calls per meeting
- ✅ FEAT-EMAIL-UPCOMING-NOAGENDA-001 — Collapse redundant no-agenda copy in UpcomingMeeting email
- ✅ FEAT-MEETINGCARD-STATUS-CTA-001 — Gate "View summary & transcript" CTA on meeting status
- ✅ FEAT-MEETINGFILTER-STATUS-001 — Add status/upcoming filter to city meeting list (client-side scope)
- ✅ FEAT-ADMIN-DIGEST-SUBSCRIBER-SUMMARY-001 — Weekly subscriber-count summary (no PII) appended to the admin digest
- ✅ US-ALERT-001 — Subscribe to a city's upcoming agenda items
- 🔄 US-ALERT-002 — Notify ahead of an upcoming vote (core mechanism shipped; no guaranteed lead time)
- ✅ US-ALERT-003 — Topic watch alerts
- 📋 US-PREF-001 — Optional topic preferences (distinct from US-ALERT-003 — see note)
- 📋 US-PREF-002 — "What's new since you last checked" digest
- 📋 US-PREF-003 — Tune suggestions from behavior, not just stated preference
- 📋 US-SUMMARY-TOPIC-LINKS-001 — Hyperlink topic mentions in summaries to interest-area pages
- 📋 US-REEL-001 — Auto-generated highlight clips
- 📋 US-REEL-002 — Shareable / embeddable clip pages
- 📋 US-REEL-003 — Social-ready clip exports

## Active Stories

### FEAT-ADMIN-DIGEST-SUBSCRIBER-SUMMARY-001 — Weekly subscriber-count summary in the admin digest

**Status:** ✅ Done

**As an** admin,
**I want** a once-a-week summary of active subscription counts per city/topic
and how they changed since last week,
**so that** I can gauge growth/attrition without querying the database
directly, and without any subscriber PII appearing in the email.

**Design:**
- Appended to the existing daily `sendDueAdminDigest()` (`app/lib/adminDigest.ts`)
  as one more `DigestGroup`, gated to fire only once every 7 days — not a
  separate cron route, since the admin digest already runs daily and the
  weekly cadence is purely a "should this section be included today" check.
- Cadence state: a new nullable `AdminDigestState.subscriberSummarySentAt`
  singleton row (mirrors the existing single-purpose-marker pattern used by
  `Meeting.staleAgendaNotifiedAt` — a small dedicated field/table rather than
  parsing digest history). Section included when
  `now - subscriberSummarySentAt >= 7 days` (or never sent).
- **Counts only, zero PII**: `Subscription.status = "ACTIVE"` grouped by
  `cityId` (city subscriptions) and by `interestAreaId` (topic
  subscriptions) via `groupBy`/`_count` — no `Subscriber.email` or any other
  per-person field is read for this feature.
- **Weekly change**, without a new snapshot table: for the same trailing
  7-day window, count `Subscription` rows with `confirmedAt >= weekAgo` as
  new, and rows with `unsubscribedAt >= weekAgo` as lost, per group; net
  delta = new − lost. Rendered as `+2` / `−1` / `±0` next to each count.
- One compact section, one row per city and one row per topic — e.g.
  `Monterey Park: 41 subscribers (+2 this week)` /
  `Bike Lanes · Monterey Park: 9 (+1)`. Cities/topics with zero active
  subscriptions and zero change are omitted, keeping it short even as the
  subscriber base grows.

**Acceptance Criteria:**
- [x] New `AdminDigestState` singleton (migration
      `20260827180000_add_admin_digest_state`) with
      `subscriberSummarySentAt DateTime?`.
- [x] New `buildSubscriberSummaryGroup(now)` in `app/lib/adminDigest.ts` —
      returns `DigestGroup | null` (null when not due this week, or when
      there is nothing to report).
- [x] `sendDueAdminDigest()` appends the group when due, and — independent
      of whether any other alerts/stale-agenda items exist that day —
      stamps `subscriberSummarySentAt = now` once actually sent, only after
      a real digest went out (mirrors the existing stale-agenda/Alert
      stamping rationale: same snapshot regardless of per-admin send
      failures). Does not block on `pending.length === 0`, matching the
      existing stale-agenda check.
- [x] No `Subscriber.email` (or any other subscriber-identifying field) is
      queried or rendered anywhere in this feature — the entire code path
      is `groupBy`/`_count` against `Subscription`, plus `City`/`InterestArea`
      name lookups for display labels; confirmed by grep.
- [x] Zero-count/zero-change groups are omitted from the section (a
      city/topic only appears when it has active subscribers or nonzero
      weekly new/lost activity).
- [x] `npx tsc --noEmit` and `npm run lint` clean; `npm run build` succeeds.
- [x] Verified against local Postgres (Docker `ccc-postgres`, via
      `prisma.config.docker.ts`/`.env.docker` — `db:push:local`) with
      seeded `Subscription` rows spanning both sides of the 7-day boundary:
      3 city subs (2 >7d old, 1 confirmed 2 days ago) + 1 unsubscribed 3
      days ago produced the correct `±0` net delta against the pre-existing
      baseline; 1 topic sub confirmed yesterday produced `+1`. Also
      confirmed the weekly-cadence gate: stamping
      `subscriberSummarySentAt = now` then rebuilding returns `null`, reset
      afterward. Verification script was temporary (deleted after use, per
      this repo not having a persistent script-retention convention like
      the transcriber repo's).

**Notes:** background/context from the user: "no PII, just counts of
subscriptions per city/topic, and any changes that week e.g. +2
subscribers" — deliberately concise per that instruction, one section, not
a full analytics breakdown. This repo requires a branch + PR (not
direct-to-main) per its own convention — shipped on
`feat/admin-digest-subscriber-summary`.

**Incident during implementation:** `npx prisma migrate deploy` was run
once without an explicit `DATABASE_URL` override; `prisma.config.ts` loads
`.env` (not `.env.local`), whose `DATABASE_URL`/`DIRECT_URL` point at
production Neon — so that command applied the `AdminDigestState`
`CREATE TABLE` migration to production before any of this story's app code
existed. Confirmed the table landed empty (0 rows) and no other table was
touched. Flagged to the user immediately; their call was to leave it
(additive, harmless) rather than roll back. All subsequent schema/data work
for this story used `prisma.config.docker.ts` explicitly, which correctly
scopes to local Postgres via `.env.docker`.

---

### FIX-STALE-SITE-URL-DOMAIN-001 — Fix stale domain links + the "agenda fetch looks stuck" digest alert

**Status:** ✅ Done

**As an** admin, **I want** digest emails to link to the current domain and
report agenda problems accurately and only once, **so that** I can trust and
act on what the digest tells me.

User forwarded a daily admin digest reporting two problems: an email link to
`transcripts.ayoshitake.com` instead of the current domain, and a repeated
"⚠️ Agenda fetch looks stuck" alert for a Fort Collins meeting. Full
investigation and root cause at
`/Users/bob/.claude/plans/i-want-to-flag-linear-river.md` (shared with the
companion `city-council-transcriber` story
`FIX-AGENDA-ITEMS-NEVER-EXTRACTED-001`, which does the actual scraper-side
fix this alert was correctly complaining about).

**Domain links:** `getSiteUrl()` (`app/lib/email.ts`) throws when
`NEXT_PUBLIC_SITE_URL` is unset, and emails are sending — so the var isn't
missing, it's **set to the old domain in production**. Confirmed
independently live: `robots.txt`/`sitemap.xml` both emitted
`transcripts.ayoshitake.com`. The actual fix is a Vercel env var change +
redeploy (`NEXT_PUBLIC_*` is build-time inlined), not code — flagged to the
user, not applied here. Fixed the three hardcoded legacy-domain fallbacks
that would silently resurrect the old host if the env var were ever cleared
(`app/robots.ts`, `app/sitemap.ts`, `app/transcripts/[...slug]/page.tsx`'s
`SUMMARY_REQUEST_EMAIL`), centralized into new `app/lib/siteUrl.ts`.

**Digest alert:** `findStaleAgendaMeetings()` (`app/lib/adminDigest.ts`)
flags SCHEDULED meetings with `agendaLastFetchedAt` set but zero
`AgendaItemVersion`/`MeetingDocument` rows. Its stated diagnosis ("likely a
silently-failed or misrouted fetch") was wrong — confirmed live against prod
Neon that **all 53 Fort Collins and all 84 Seattle meetings** were zero-yield
(a city-wide scraper gap, now fixed in `city-council-transcriber`), not a
one-off failure. Its underlying complaint was right, though, so this story
does NOT suppress the check — it corrects the message and adds dedupe/
re-escalation so a genuine future recurrence is reported once, not every
day it sits in the 3-day lookahead window.

**Corrected a stale claim**: `FIX-MP-SAMEDAY-MEETING-COLLISION-001` states
this check "correctly flags 3 real Seattle zero-yield meetings," framing
them as validating true positives. All 84 Seattle meetings were zero-yield
at the time — those 3 were this same structural gap, only visible because
they fell inside the lookahead window, not evidence the check was already
working correctly.

**Acceptance Criteria:**

- [x] `app/robots.ts`, `app/sitemap.ts`, `app/transcripts/[...slug]/page.tsx`
      use a shared `FALLBACK_SITE_URL`/`FALLBACK_ADMIN_EMAIL`
      (`app/lib/siteUrl.ts`) pointing at `counciloris.com`, not the retired
      `transcripts.ayoshitake.com`
- [x] Digest alert text states the observed fact (agenda source scraped, no
      items/documents extracted) without asserting a cause it can't confirm
- [x] New `Meeting.staleAgendaNotifiedAt` column + migration
      (`20260824194129_add_meeting_stale_agenda_notified_at`) — deliberately
      NOT routed through the subscriber-facing `Alert`/`AlertStatus` table
      (which includes `PUBLISHED`); an internal admin diagnostic must never
      reach a real subscriber
- [x] `selectStaleAgendaMeetingsToNotify()`: suppress a meeting already
      flagged once unless it's now within 24h of happening (re-escalation
      window for a genuinely still-broken agenda), mirroring
      `createMeetingUpdateAlert`'s dedupe rationale
- [x] `tsc --noEmit`, `npm run lint`, `npm run build` all clean; build
      confirmed to still succeed with no database reachable (this repo's
      established convention — `generateStaticParams() => []` + ISR, see
      `FIX-NEON-EGRESS-*`), previously-static routes (`/_not-found`,
      `/icon.svg`, `/apple-icon.png`, `/robots.txt`) unchanged
- [x] `findStaleAgendaMeetings()` wraps its query in try/catch, degrading
      to "no stale-agenda items this run" (logged, non-fatal) if the
      migration below hasn't been applied yet — added after review: without
      this, deploying this PR before the migration runs would make the
      unknown-column error kill the *entire* digest send (including real
      Alert-backed items), not just the stale-agenda section. This repo has
      hit exactly this failure mode before: the `add_roster_member`
      migration (PR #19) shipped un-applied and 500'd every transcript page
      until noticed (documented in `city-council-transcriber/prd.md`'s
      `FIX-AUTODL-CROSS-SOURCE-DUP-001`) — this guard exists specifically so
      that can't repeat.
- [ ] **Deployment step, not done here**: `npx prisma migrate deploy`
      against prod Neon — confirmed live that the column does not exist in
      prod yet (a read-only query against it failed as expected; the guard
      above means this is now a degrade, not an outage, if merged first
      anyway, but the migration should still run promptly so the feature
      actually works). Also: set `NEXT_PUBLIC_SITE_URL` to the current
      domain in Vercel and redeploy (the actual link fix); update the
      `PROD_SITE_URL` GitHub Actions repo variable; update
      `city-council-transcriber/.env`'s `SITE_URL_PROD`. None of these are
      code changes and were not applied unilaterally — outward-facing
      production changes flagged to the user.
- [ ] This repo has no test runner beyond typecheck/lint
      (`npm run test:quick`); the query logic was instead verified by direct
      read-only execution against prod Neon (same result as the
      investigation: 1 stale candidate, Fort Collins 2026-08-25) rather than
      a mocked unit test
- [ ] **Caveat on the "alert goes to zero" verification**: Municode's
      `fetch_for_meeting()` only (re-)writes `agenda.json` when it doesn't
      already exist (or `force=True`). If production's
      `storage/fort-collins/2026-08-25/.../agenda.json` already exists from
      before the companion fix, the new parser won't run for that specific
      meeting on its normal cadence, and `findStaleAgendaMeetings()` will
      keep returning that one row until either it naturally re-scrapes past
      that gate or someone forces a re-fetch. A non-zero result for that one
      meeting isn't automatically evidence the fix is broken — check whether
      that meeting's `agenda.json` predates the fix before concluding that.

### US-LOCALDB-001 — Local Postgres for development

**Status:** ✅ Done

**As a** developer working on the frontend
**I want** to run the app against a local Postgres instance
**So that** I can develop and run migrations/seeds without depending on a hosted Neon database.

**Acceptance Criteria:**

- [x] `docker-compose.yml` provisions a local Postgres 16 instance with a named volume for persistence
- [x] `.env.example` documents both the Neon (production) and local Docker connection strings
- [x] A working `.env` is present locally pointing `DATABASE_URL` and `DIRECT_URL` at the Docker instance (gitignored)
- [x] `npm run db:push` and `npm run db:seed` succeed against the local DB
- [x] `npm run dev` serves pages backed by the local DB
- [x] README documents the local-Postgres workflow (start container, push schema, seed, run)

**Notes:**

- Schema uses Postgres-specific types (`@db.VarChar`, `@db.Text`, `Json`), so SQLite is not viable without invasive schema changes — local Postgres preserves prod parity.
- The Neon adapter (`@prisma/adapter-neon`) is installed but not wired into `app/lib/prisma.ts`, so no client-side branching is required for local dev.

---

### FIX-ALERT-AGEGATE-NULLMEETING-001 — Age-gate interest-area alerts with no meetingId

**Status:** ✅ Done (AC-1.4 not done — no existing unit test suite for alerts.ts to extend)

**As a** subscriber
**I want** to not receive alert emails about meetings from years ago
**So that** my inbox reflects what's actually new, not old data being reprocessed

Root cause: `isAlertMeetingTooOldForSubscribers` (`app/lib/alerts.ts:419-426`) returns `false` (i.e. "not too old, send it") whenever `alert.meetingId` is null. Postmeeting `INTEREST_AREA_UPDATED` alerts are created with `meetingId: undefined` (`app/lib/alerts.ts:225-232`), so they never go through the 30-day age gate that `MEETING_UPDATED`/`MEETING_UPCOMING` alerts already respect (`app/lib/publish.ts:104-110`). When the transcriber backfills/reprocesses an old meeting and that updates an InterestArea's `statusSummary` rollup, the resulting subscriber email is sent regardless of age.

**Acceptance Criteria:**
- [x] AC-1.1: `isAlertMeetingTooOldForSubscribers` (or its caller) resolves a representative meeting date for interest-area alerts (e.g. via the area's most-recently-discussed meeting) instead of short-circuiting on null `meetingId`.
- [x] AC-1.2: A postmeeting `INTEREST_AREA_UPDATED` alert whose underlying meeting is older than the existing age cutoff is auto-canceled the same way `MEETING_UPDATED`/`MEETING_UPCOMING` alerts already are.
- [x] AC-1.3: Preview-phase interest-area alerts (which always have a `meetingId`) are unaffected — this only closes the null-meetingId gap.
- [ ] AC-1.4: Not done — repo has no existing unit test suite for `alerts.ts` (only `tests/e2e`) to extend; flagged as a gap, not silently skipped.

---

### FEAT-ADMIN-DIGEST-ALWAYS-001 — Route all automated admin alerts through the daily digest only

**Status:** ✅ Done

**As an** admin reviewing meeting content
**I want** at most one admin email per day
**So that** reprocessing/backfill of old meetings doesn't spam my inbox with individual emails

Today most admin alerts are created `DRAFTED` and swept once daily by the `/api/cron/admin-digest` route (`app/lib/adminDigest.ts`, 12:55 UTC) — this part already works. But three call sites bypass the digest and email admins instantly: `app/actions/updateMeetingTitle.ts:36`, `app/api/admin/upcoming-alert/route.ts:89` (when `agenda_available`), and `app/api/admin/interest-area-alert/route.ts:84` (preview phase). The upcoming-alert and interest-area-alert paths are automated (triggered by the transcriber pipeline), so any volume of qualifying events becomes that many separate instant admin emails on top of the daily digest.

**Acceptance Criteria:**
- [x] AC-2.1: `app/api/admin/upcoming-alert/route.ts` and `app/api/admin/interest-area-alert/route.ts` (preview phase) no longer call `sendAlertToAdmins` inline — alerts are left `DRAFTED`/`PUBLISHED` and picked up by the existing admin-digest cron.
- [x] AC-2.2: `app/actions/updateMeetingTitle.ts`'s instant admin send is left as-is (it's a manual, user-initiated one-off action, not an automated/recurring trigger) — confirmed this is the only justified exception.
- [x] AC-2.3: Subscriber-facing instant sends (`publishAlertToSubscribers` for preview-phase/time-sensitive content) are unaffected — this story only changes admin fan-out timing.
- [ ] AC-2.4: Not verified end-to-end against a live cron run (no test DB/queue harness available in this session) — verified by code inspection + typecheck instead. **Important fix discovered along the way**: `publishAlertToSubscribers` unconditionally sets `Alert.status = PUBLISHED`, so once the instant admin send was removed, `sendDueAdminDigest`'s original `status: "DRAFTED"` filter would have silently never picked these alerts up — admins would get *zero* notification instead of a batched one. Fixed by widening the digest query to `status: { not: "CANCELED" }` and making the post-bundle status update conditional (only a still-`DRAFTED` alert flips to `SENT_TO_ADMINS`; an already-`PUBLISHED` one just gets `sentToAdminsAt` stamped, so the scheduled drain never re-publishes it to subscribers a second time).

**Notes:** a daily digest fixes email *count* but not necessarily *volume* — if a backfill touches 200 old meetings in one day, admins still get one email with 200 rows. Combined with FIX-ALERT-DEDUP-001 below, repeat rows across multiple days for the same unchanged meeting should stop.

**Follow-up fix (2026-07-17):** a post-merge code review found `createMeetingUpcomingAlert` (`app/lib/alerts.ts`) has no dedup at all — by design, each call creates a fresh alert (a no-agenda placeholder and the later real agenda-backed alert are deliberately distinct content, not a repeat of the same thing). But nothing ever resolved the earlier placeholder once superseded: a no-agenda alert that already reached `SENT_TO_ADMINS` via the daily digest stayed there permanently (its `scheduledFor` is always null for this alert type, so the scheduled drain never touches it either) — harmless (no incorrect email), but an unbounded accumulation of dead rows. Fixed by canceling any earlier non-terminal (`DRAFTED`/`SENT_TO_ADMINS`) `MEETING_UPCOMING` alert for the same meeting before creating the new one. Verified by typecheck + code inspection only — same test-coverage gap as the rest of `alerts.ts` (no unit test suite to extend), and the live write-path test against prod that would have exercised this was blocked by Claude Code's own auto-mode safety classifier (creating/mutating real `Alert` rows), same as the earlier age-gate/digest test attempt — not retried without fresh authorization.

---

### FIX-ALERT-DEDUP-001 — Dedup repeat createMeetingUpdateAlert calls per meeting

**Status:** ✅ Done (AC-3.3 not done — no existing unit test suite for alerts.ts to extend)

**As an** admin
**I want** a given meeting's update alert to appear once, not once per reprocessing run
**So that** old meetings caught in a transcriber backfill don't resurface in my digest day after day

Root cause: `createMeetingUpdateAlert()` (`app/lib/alerts.ts:120-139`) has no idempotency/dedup check — every call (including repeat publish/backfill calls for a meeting whose content hasn't materially changed) creates a fresh `DRAFTED` `Alert` row. Since `FEAT-ADMIN-DIGEST-ALWAYS-001` sweeps all un-actioned `DRAFTED` alerts daily, a meeting reprocessed on multiple different days produces a new alert — and a new digest row — each time.

**Acceptance Criteria:**
- [x] AC-3.1: `createMeetingUpdateAlert` checks for an existing not-yet-terminal (`DRAFTED` *or* `SENT_TO_ADMINS`) alert for the same `meetingId`+`type` with equivalent content before creating a new one; if found and content is unchanged, no new alert is created.
- [x] AC-3.2: A genuine content change (e.g. a corrected summary) for the same meeting still produces an updated alert (content overwritten in place, reset to `DRAFTED` so admins re-review before it can drain) — this is dedup, not suppression of real updates.
- [ ] AC-3.3: Not done — no existing unit test suite for `alerts.ts` to extend; verified by code inspection + typecheck only.

**Follow-up fix (2026-07-17):** original dedup only matched `status: "DRAFTED"`. A code review after shipping caught a real gap: once the admin digest sweeps an alert to `SENT_TO_ADMINS` (in flight, waiting on its `scheduledFor` drain), it no longer matched the dedup query — a reprocessing run before that drain fired would create a second, brand-new alert for the same meeting, and **both would eventually drain to subscribers independently, double-sending the same meeting update.** Widened the dedup query to `status: { in: ["DRAFTED", "SENT_TO_ADMINS"] }`; a genuine content change on an already-`SENT_TO_ADMINS` alert now resets it to `DRAFTED`/clears `sentToAdminsAt` so it goes through admin review again rather than silently updating an alert admins already reviewed. Shipped as PR (see git history) rather than amending the original merged commit.

---

### FEAT-EMAIL-UPCOMING-NOAGENDA-001 — Collapse redundant no-agenda copy in UpcomingMeeting email

**Status:** ✅ Done

**As a** subscriber
**I want** the "upcoming meeting" email to be short when there's nothing to say yet
**So that** I'm not reading the same city/title/date restated three times with no new information

`emails/UpcomingMeeting.tsx` has no conditional logic — it always renders the header, "Quick take", and "Full picture" sections, each restating city/title/date. The route that calls it (`app/api/admin/upcoming-alert/route.ts`) already receives an `agenda_available` boolean but never threads it through to the email.

**Acceptance Criteria:**
- [x] AC-4.1: `agenda_available` is threaded from `app/api/admin/upcoming-alert/route.ts` → `MeetingUpcomingContent` → `sendUpcomingMeetingEmail` → `emails/UpcomingMeeting.tsx` props (`agendaAvailable`, defaults to `true`).
- [x] AC-4.2: When `agendaAvailable` is false, the "Full picture" section is skipped entirely — no restating city/title/date a third time.
- [x] AC-4.3: When an agenda exists (`agendaAvailable` true/default), the email is unchanged from today's behavior.
- [x] AC-4.4: Verified with `@react-email/render` (plain-text mode) for both cases: the no-agenda render dropped the "Full picture" section entirely (376 vs. 348 chars for a *longer* real-agenda body/shorter placeholder text — the meaningful check was confirming the section itself disappeared, not raw length).

---

### FEAT-MEETINGCARD-STATUS-CTA-001 — Gate "View summary & transcript" CTA on meeting status

**Status:** ✅ Done

**As a** site visitor browsing a city's meeting list
**I want** upcoming/unpublished meetings to look different from published ones
**So that** I don't click into a "summary & transcript" link that doesn't exist yet

`app/components/MeetingCard.tsx:42-44` renders the "View summary & transcript" link unconditionally, even though `meeting.status` (`SCHEDULED`/`OCCURRED`/`PUBLISHED`/`CANCELED`, `prisma/schema.prisma:52-57`) is already present on every meeting reaching the component via `getMeetingsForCity` → `MeetingFilter` → `MeetingCard`.

**Acceptance Criteria:**
- [x] AC-5.1: When `meeting.status !== "PUBLISHED"`, the card shows the meeting date and a status badge ("Upcoming meeting" / "Transcript pending" / "Canceled") instead of the "View summary & transcript" CTA.
- [x] AC-5.2: `PUBLISHED` meetings are unaffected — same CTA as today.
- [x] AC-5.3: Matches the existing "Meeting held — transcript pending" language/style already used on the detail page for consistency (shortened to "Transcript pending" to fit the card's compact badge).
- [x] AC-5.4: Verified visually against `wa/seattle` (has a real `SCHEDULED` meeting) in a running dev server — confirmed exactly one "Upcoming meeting" badge rendered and zero misleading "View summary & transcript" links for that meeting.

---

### FEAT-MEETINGFILTER-STATUS-001 — Add status/upcoming filter to city meeting list

**Status:** ✅ Done (client-side scope; server-side + URL-sync deferred)

**As a** site visitor viewing a city with a long meeting history (e.g. Seattle)
**I want** to filter the list to just upcoming meetings, or hide ones without a transcript yet
**So that** I don't have to scroll past dozens of not-yet-transcribed meetings to find what I want

`app/components/MeetingFilter.tsx` already had client-side text search and newest/oldest sort, with an inline comment noting client-side filtering doesn't scale and should move server-side for larger cities — Seattle's volume has now hit that point.

**Acceptance Criteria:**
- [x] AC-6.1: Adds a status filter ("All meetings" / "Published only" / "Upcoming" / "Awaiting transcript") using the existing `meeting.status` field, alongside the existing search/sort controls.
- [ ] AC-6.2: Deferred — filtering still happens client-side over the already-fetched full list. Worth revisiting if Seattle-scale cities' initial page-load payload becomes the bottleneck (separate from filter UX, which this story addresses).
- [ ] AC-6.3: Deferred — filter state is local component state, not synced to the URL. Would need a Suspense boundary around `useSearchParams` in the parent page; scoped out to keep this change minimal until bookmarkable filtered views are actually requested.
- [x] AC-6.4: Verified against Seattle's city page in a running dev server — confirmed the status `<select>` renders and a `SCHEDULED` meeting no longer shows the misleading "View summary & transcript" CTA (see FEAT-MEETINGCARD-STATUS-CTA-001).

---

## Backlog: PoC feedback Phases 4–6

The PoC feedback session (2026-06) surfaced themes beyond what shipped in Phases 0–3 (homepage/nav/affordance cleanup, TLDR-first meeting pages, council member vote transparency, search/filter, and the slug-vs-filename naming fix). **Phase 4 (alerts & subscriptions) shipped** across PRs #7, #11, #12, #13, #17, #18, #21–23 (2026-06-26 through 2026-07-17) — the statuses below were reconciled 2026-07-27 after they were found still marked "Not started" despite being live on `main`. Phases 5–6 remain backlog, **not implemented yet** — scope each into its own pass before building.

### Phase 4 — Alerts & subscriptions

Builds on the existing module spec at `specs/subscription/requirements.md` and `specs/subscription/design.md`, which already covers the base subscribe/confirm/unsubscribe flow (US-1–US-3 there). The stories below extend that module with the specific behavior PoC testers asked for: **alerting before** a vote happens, not after.

#### US-ALERT-001 — Subscribe to a city's upcoming agenda items

**Status:** ✅ Done (reconciled 2026-07-27 — shipped, PRD was stale)

**As a** resident who doesn't check the site regularly
**I want** to subscribe to a city and get notified about upcoming meetings
**So that** I don't have to remember to come back and check

**Acceptance Criteria:**
- [x] AC-1.1: `Subscriber`/`Subscription` models (`prisma/schema.prisma`) — superset of the original spec (adds `AlertFrequency`, `kind`, per-subscription `unsubscribeToken`).
- [x] AC-1.2: `MEETING_UPCOMING` alerts (`app/lib/alerts.ts::createMeetingUpcomingAlert`) fire once an agenda is available, fanned out per subscriber frequency via `publishAlertToSubscribers`; sourced from the transcriber's `POST /api/admin/upcoming-alert` (`agenda_available` gate — a no-agenda placeholder is admin-only, not sent to subscribers).
- [x] AC-1.3: Email body (`emails/UpcomingMeeting.tsx`) renders LLM-generated "bite/snack/meal" plain-language tiers (`city-council-transcriber/src/upcoming_summarizer.py::generate_alert_tiers`), not raw agenda codes — satisfies the intent, though implemented via LLM summarization rather than the originally-suggested `app/lib/labels.ts` term substitution.

#### US-ALERT-002 — Notify ahead of an upcoming vote

**Status:** 🔄 Partially done (reconciled 2026-07-27) — core mechanism shipped; no guaranteed minimum lead time

**As a** resident concerned about a specific issue (e.g. data centers, housing)
**I want** to be told *before* the council votes on it
**So that** I have a chance to act (show up, comment, contact my rep) while it still matters

PoC feedback was explicit that this is the single most valuable feature: *"the biggest thing is to alert AHEAD of time. If something already happened, what are you going to do about it?"*

**Acceptance Criteria:**
- [x] AC-2.1: Agenda data now exists before the meeting — `city-council-transcriber`'s `upcoming_scraper.py` pre-fetches agendas and upserts a pre-transcription `Meeting`/`AgendaItemVersion` stub into Neon.
- [ ] AC-2.2: A background job (`interest_area_notifier.py` → `POST /api/admin/interest-area-alert`, preview phase) does detect newly-published agenda items matching a subscriber's watched topic/city and notifies before the meeting — but **there is no enforced minimum lead time**; whether it lands 48h ahead depends entirely on how far ahead the source city posts its agenda and how quickly the scraper notices (today's flat scrape interval, being tightened by `US-CADENCE-PREDICT-001` in the sibling repo). A city that posts its agenda the same day gets a same-day alert, not a blocked one. If a hard 48h floor is actually wanted, that's unbuilt — file as a follow-up rather than assuming it's covered.
- [x] AC-2.3: `emails/InterestAreaUpdated.tsx`/`UpcomingMeeting.tsx` include the item/topic name, the meeting date, and a direct link (`areaUrl`/`meetingUrl`) to the not-yet-held meeting page.

#### US-ALERT-003 — Topic watch alerts

**Status:** ✅ Done (reconciled 2026-07-27 — shipped, PRD was stale)

**As a** resident who cares about specific issues, not every meeting
**I want** to watch a topic (e.g. "housing", "data centers") across all meetings for my city
**So that** I only get notified when something relevant comes up, not every meeting

**Acceptance Criteria:**
- [x] AC-3.1: `InterestArea` model (per-city topic, `slug`/`name`/`globalTopicId` cross-link) — a first-class model rather than free-text tagging on `Subscriber`, since a topic needs its own page/URL on the site (`app/[state]/[city]/topics/[slug]/page.tsx`), not just an alert-matching key.
- [x] AC-3.2: Matched at ingestion by `city-council-transcriber`'s `interest_area_summarizer.py` (both premeeting/preview and postmeeting phases), written to `InterestAreaMeetingStatus`.
- [x] AC-3.3: `app/subscriptions/page.tsx` lists each `Subscription` row (including `TOPIC_IN_CITY_UPDATES`) individually and unsubscribes by row (`unsubscribe(token, subscriptionId)`) — removing one watched topic doesn't require re-subscribing to the rest; adding a new topic happens via that topic's page (`SubscribeForm.tsx`), not this management page.

---

### Phase 5 — Personalization & preferences

#### US-PREF-001 — Optional topic preferences

**Status:** 📋 Not started

**Note (added 2026-07-27):** don't conflate this with US-ALERT-003, which is done. US-ALERT-003 is an opt-in **email subscription** to a specific topic (explicit commitment, sends mail). This story is a lighter-touch, skippable **on-site preference** that reorders/highlights content for an anonymous visitor without sending anything — a genuinely different surface, and grepping the codebase (`app/`) turns up no "preference"-named UI or reordering logic anywhere. Still unbuilt.

**As a** new visitor
**I want** to optionally tell the site what I care about (housing, environment, public safety, etc.)
**So that** relevant meetings/topics are surfaced to me without me having to dig

PoC feedback: *"giving people options for preference is great — not making them HAVE to make that decision is great."* Preferences must be optional and skippable, never a gate in front of using the site.

**Acceptance Criteria:**
- [ ] AC-1.1: A preferences UI (e.g. on first visit or in a settings page) lets a user pick zero or more topics.
- [ ] AC-1.2: Skipping preferences entirely results in the same default experience as today — no degraded or blocked functionality.
- [ ] AC-1.3: Preferences influence ordering/highlighting on the city page (e.g. matching topics surfaced first) without hiding other content.

#### US-PREF-002 — "What's new since you last checked" digest

**Status:** 📋 Not started

**As a** resident following a specific local issue over time
**I want** a short digest of what's changed on topics I'm tracking
**So that** I can follow an issue's progress without re-reading everything

PoC feedback: *"you were concerned about local wastewater issues — these were things before, and these are things now."*

**Acceptance Criteria:**
- [ ] AC-2.1: Depends on US-PREF-001 (stated preferences) and/or US-ALERT-003 (watched topics).
- [ ] AC-2.2: Digest summarizes only new items since the user's last visit/notification, not the full history.

#### US-PREF-003 — Tune suggestions from behavior, not just stated preference

**Status:** 📋 Not started

**As a** product team
**I want** to track what users actually open/read (lightly, anonymized) vs. what they said they care about
**So that** suggestions improve over time and reflect real interest, not just a one-time form answer

PoC feedback distinguished **behavior vs. intent** explicitly as something to design for.

**Acceptance Criteria:**
- [ ] AC-3.1: Track view events on meetings/topics without requiring an account (session-scoped is acceptable for v1).
- [ ] AC-3.2: Surfaces a privacy-respecting explanation of what's tracked and why; no dark patterns.
- [ ] AC-3.3: Stated preferences remain user-overridable — behavior tuning augments, never silently overrides, explicit choices.

---

### Phase 5.5 — In-summary topic linking

#### US-SUMMARY-TOPIC-LINKS-001 — Hyperlink topic mentions in summaries to interest-area pages

**Status:** 📋 Not started

**As a** resident reading a meeting's TL;DR or key-decisions summary
**I want** a topic word (e.g. "housing", "short-term rental") that's mentioned in the summary to be a link
**So that** I can jump straight to that topic's interest-area page (or the specific moment in this meeting that discusses it) instead of re-reading the whole summary/transcript to find context

User-reported (2026-07-18), inspired by a real digest email: the July 15, 2026 Monterey Park summary mentions "housing-overlay ballot language," "short-term rental enforcement," "weed abatement," and "TOT ballot argument" — none of these are currently linked anywhere, even though `app/[state]/[city]/topics/[slug]` (interest-area pages) and the existing timecode-citation system (`[1]`-style `references` on `MeetingSummaryItem`, see `d54b66a`) already provide both plausible link targets.

**Open design question (needs a decision before implementation):** when a summary mentions a topic, should the link prefer:
  (a) the city's interest-area/topic page for that topic (`getInterestArea`/`TopicsPanel`), giving cross-meeting context, or
  (b) the specific transcript timestamp within *this* meeting that discusses it (reusing the existing `references`/timecode-citation machinery)?
The user's phrasing ("or fallback to the part of the meeting that discusses it") suggests (a) as primary with (b) as a fallback when no matching interest-area page exists for that city/topic — this needs confirming with the user before scoping acceptance criteria precisely, and likely needs a matching pass in `city-council-transcriber`'s summarizer (`src/interest_area_summarizer.py` already does agenda-only topic classification — a similar mention-span/topic-tagging step may need to run over generated summary text, not just agendas) so summary text arrives with topic spans already identified rather than being pattern-matched client-side in `city-council-transcripts`.

**Acceptance Criteria (draft — pending design decision above):**
- [ ] AC-1: Topic mentions within TL;DR/key-decisions summary text are detected and wrapped as links (exact mechanism TBD: transcriber-side tagging vs. client-side keyword matching against known interest areas).
- [ ] AC-2: Link target resolution: interest-area page if the city has one for that topic, else the in-meeting timestamp where it's discussed (pending confirmation of preferred order).
- [ ] AC-3: No link is rendered if neither an interest-area page nor a timestamp reference can be confidently resolved (avoid dead/wrong links — this is user-facing accuracy-sensitive, similar bar to the existing `references` citation system).

---

### Phase 6 — Highlight reels & social (lowest priority — explicitly "far down the line")

#### US-REEL-001 — Auto-generated highlight clips

**Status:** 📋 Not started

**As a** casual visitor
**I want** a short clip of the most important moment in a meeting
**So that** I can get the gist without reading or watching the whole thing

**Acceptance Criteria:**
- [ ] AC-1.1: Reuses existing timestamp data (`MeetingSummaryItem.startTimeSeconds`/`endTimeSeconds`, `MeetingSegment`) to identify clip boundaries — no new timestamping work needed.
- [ ] AC-1.2: Produces a short (under ~60s) video clip per key decision/motion, derived from the existing YouTube source.

#### US-REEL-002 — Shareable / embeddable clip pages

**Status:** 📋 Not started

**As a** resident who found something interesting
**I want** to share a specific clip via a link or embed it elsewhere
**So that** others can see the relevant moment without watching the full meeting

**Acceptance Criteria:**
- [ ] AC-2.1: Each clip gets its own shareable URL with OpenGraph/Twitter card metadata.
- [ ] AC-2.2: An embeddable `<iframe>` snippet is available for the clip.

#### US-REEL-003 — Social-ready clip exports

**Status:** 📋 Not started

**As a** resident active on social media
**I want** to post a council clip directly to social platforms
**So that** civic information reaches people who are "already there" rather than requiring them to visit the site first

PoC feedback: *"social media integration could help reach users already online."* Team flagged this as speculative/future-proofing, not a near-term commitment.

**Acceptance Criteria:**
- [ ] AC-3.1: Clip export format meets common platform aspect-ratio/duration constraints (e.g. vertical 9:16 for Reels/Shorts/TikTok, as a stretch).
- [ ] AC-3.2: Depends on US-REEL-001 being in place first.
