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
- ✅ FIX-RECAP-ALERTS-NEVER-CREATED-001 — Past-meeting recap alerts are never created for stub-seeded meetings (fixed entirely in `city-council-transcriber`; user decided against a historical backfill given the real 160-meeting/4-city scope found)
- ✅ FIX-TIMESTAMP-LABEL-EMPTY-001 — Meeting page renders a dangling "at __" with no timestamp
- ✅ FIX-ANNOTATEDTEXT-REMAINDER-DUP-001 — Cursor-based (not length-sum) remainder reconstruction in `AnnotatedText`/`annotateTextPlain`, so a `references` entry dropped by `isValidRef` can't desync the remainder slice and re-render already-shown text
- ✅ FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001 — Normalize + highlight city/topic search matches
- 📋 FEAT-SEARCH-SERVERSIDE-SURFACE-001 — Expand search to summary items/topics, move server-side
- 🔄 FEAT-VIDEO-POSTER-001 — Video thumbnail instead of a black first frame (AC-1/AC-3 shipped for YouTube; AC-2 mp4 poster is a real, ~100-meeting Seattle-only gap, blocked on a server-side frame-grab — client-side canvas capture confirmed CORS-blocked against real data)
- 🚫 FIX-EXTERNAL-VIDEO-LABEL-001 — Label external video links (e.g. FCTV) and note VPN blocking (on hold by user decision — needs a per-city source-name design choice first)
- ✅ FIX-STALE-AGENDA-PREDICATE-001 — "Agenda fetch looks stuck" digest copy corrected to match what `agendaLastFetchedAt` actually proves (investigated the write path across both repos; found a real, narrower gap than the plan suspected)
- 📋 FEAT-FORTCOLLINS-INTEREST-AREAS-001 — Curate and generate Fort Collins interest areas
- 📋 FEAT-CITY-HOT-TOPICS-001 — Surface hot topics on the city page
- ✅ FIX-INTERESTAREA-COUNT-CONSISTENCY-001 — Topics index and detail page disagree on meeting counts
- 📋 FIX-MEETING-LAYOUT-ALIGNMENT-001 — Meeting page padding/alignment/blank-space cleanup
- ✅ FIX-REFERENCE-HEADING-001 — "Reference" section heading doesn't match its content or its own link text
- ✅ FIX-SUMMARY-GATE-NULL-001 — Summary blocks silently dropped when `meeting.summary` is null
- 📋 FEAT-MEETING-TIER-DEDUP-001 — TL;DR / Summary / Timeline repeat the same content (parked, alternate view)

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

## Backlog: Aaron's Fort Collins review (2026-09-08 session)

Aaron reviewed the site as a Fort Collins resident. His three headline complaints each had a concrete, verified root cause rather than being vague dissatisfaction: (1) subscriber recap emails for past meetings are never created for any meeting first seen as an upcoming stub — confirmed both in code and on disk against the Fort Collins archive; (2) Fort Collins has zero curated interest areas configured, so the topics page and any "hot topics" surface are empty by construction, even though the underlying `InterestArea` rollup machinery works (Monterey Park has it populated); (3) city/topic search is a client-side literal-substring match with no normalization, highlighting, or match context, and can't see summary items or topic content at all. Full session notes and exploration are in the planning transcript; stories below carry the essential file:line evidence. Phases are ordered by dependency/value, not by the existing Phase 4–6 numbering below (unrelated backlog, left as-is).

### Phase 1 — Email gap and confirmed bugs

#### FIX-RECAP-ALERTS-NEVER-CREATED-001 — Past-meeting recap alerts are never created for stub-seeded meetings

**Status:** ✅ Complete (2026-09-08) — implemented and closed entirely in `city-council-transcriber` (Python/Neon side). See that repo's `CHANGELOG.md` / `prd.md` for the full story, tests, and commits (`4e77aa0`, `c18b4f0`, `cee936e`). No changes were needed in this repo.

**Repo:** `city-council-transcriber` (Python), with a backfill decision touching Neon.

**As a** subscriber to a city's updates
**I want** an email recap when a meeting I already knew about actually happens and gets published
**So that** I know what the council decided, not just that a meeting was upcoming

Root cause, verified in code: recap notification (`_notify_admins_of_new_meeting` → `POST /api/publish-to-admins`) fires in `src/publish.py:1259-1281` unconditionally when `created` is true, and only if `notify_updates` when false. `notify_updates` defaults to `False` at every call site (`src/publish.py:949`, `:1499`, `webapp/routes/ai.py:2604`, `:2746-2754`). `created` comes from `(xmax = 0) AS inserted` on an `ON CONFLICT (slug)` upsert (`src/neon_writer.py:1772`). The upcoming scraper already inserts a `status='SCHEDULED'` stub on the same slug (`_upsert_stub_meeting_row`, `src/neon_writer.py:1251-1298`), so the later post-transcription publish always hits the conflict branch, returns `created=False`, and — with `notify_updates` false — never creates a `MEETING_UPDATED` Alert.

**Confirmed on disk**, not just from code: both notify paths write `emailed.json` via `_write_email_marker`/`_merge_marker` (`src/publish.py:633`). Across the Fort Collins archive (`/Volumes/TOSHIBA EXT/city-council-transcriber-storage/fort-collins/`), the last `emailed.json` is dated **2026-07-28**; every meeting from **2026-08-11** onward has none, and the meetings carrying `upcoming_alert_sent.json` (i.e. stub-seeded) are exactly the ones missing a recap marker — the predicted fingerprint, dating the regression to early August 2026.

**Acceptance Criteria:**
- [x] AC-0: The on-disk evidence above is restated here so the root cause isn't re-litigated before the fix.
- [x] AC-1: `_upsert_meeting` (`src/neon_writer.py:1592-1780`) returns enough state to distinguish "first real publish" from "re-publish of an already-announced meeting" (e.g. also returns the prior `status`).
- [x] AC-2: `src/publish.py:1259-1281` notifies on first-real-publish regardless of `created`; `notify_updates` continues to gate re-publishes only. (Also fixed the identical bug independently found in `webapp/routes/ai.py`'s `/api/publish` route.)
- [x] AC-3 (redefined): a literal dry-run can't validate this — `write_meeting()`'s dry-run path never opens a DB connection, so it can't read prior status. Validated instead via read-only queries against `DATABASE_URL_PROD` (see AC-5).
- [x] AC-4: Backfill decision made — **user decided (2026-09-08): do nothing retroactively (option c).** The real scope (AC-5) turned out much larger than "Fort Collins, 2026-08-11 onward": 160 already-published meetings across all 4 cities have never had a recap alert, most predating this fix by months (fort-collins back to 2025-07-15, monterey-park back to 2023-07-05), and none of that is recoverable by the code fix alone (every one of those rows already reads `status='PUBLISHED'`, so a republish now correctly does not re-notify). Given only 17 of the 160 sit inside the 30-day alert-age window regardless, the user chose to let the fix apply going forward only — no `Alert` backfill, no catch-up digest, no emails sent for the historical 160. Documented in `_should_notify_admins()`'s docstring (`src/publish.py`) so it isn't mistaken for an oversight later. **If the underlying resident complaint ("I can't find past-meeting content") resurfaces, the next lever is this repo's own site-surfacing work (city-page hot topics / past-meeting summaries, see `FEAT-CITY-HOT-TOPICS-001` below), not a mass historical email backfill.**
- [x] AC-5: Prod sanity queries run (read-only, no writes): `Alert` counts by type/status found 70 `MEETING_UPDATED` rows total historically, 50 already `CANCELED` (`canceledBy='system:meeting-too-old'` — confirming the 30-day age-gate is live and active, not theoretical). A join of published `Meeting` rows against `MEETING_UPDATED` `Alert` rows found the 160-meeting/4-city scope described in AC-4 above.
- [x] AC-6: Regression guard — a re-publish of an already-announced meeting does not produce a second alert. Covered by `test_publish_should_notify_admins.py` (pure, ran, passed) and `test_neon_writer_first_real_publish.py` (real-DB, written/reviewed but not run — no Docker in the implementation sandbox; should be run at the next opportunity).

#### FIX-TIMESTAMP-LABEL-EMPTY-001 — Meeting page renders a dangling "at __" with no timestamp

**Status:** ✅ Done

**As a** reader of a meeting summary
**I want** every timestamp reference to show a real time or nothing at all
**So that** I don't see broken-looking prose like "…approved it at " with a blank

User-reported (2026-09-08), reproduced on Fort Collins's Aug 25, 2026 meeting page. Two independent producers in `city-council-transcripts`:
- `app/components/TimestampLink.tsx:65` — `{label ?? formatTime(targetSeconds)}`. `??` does not coalesce `""`, so an empty label renders a clickable but visually empty link. Two feeds supply `""`: `app/transcripts/[...slug]/page.tsx:313-317` splits `ACTION_ITEM` labels on `/\s*-\s*/` and takes `[0]`, yielding `""` for any label starting with a dash; and a stored empty-string `timecodeLabel` survives `?? undefined` at `page.tsx:475` and `:532`.
- `app/components/AnnotatedText.tsx:66-98` — `hasContent = hasTimecode || !!ref.provenance`. When a reference has null seconds, label, and provenance, the whole citation (including its parentheses) renders as nothing while `ref.textBefore` still prints, leaving a dangling lead-in.

**Acceptance Criteria:**
- [x] AC-1: `TimestampLink.tsx:65` treats empty/whitespace labels as absent (`label?.trim() || formatTime(targetSeconds)`). Shipped in #61.
- [x] AC-2: `page.tsx:313-317` never emits an empty label from the dash split. Shipped in #61.
- [x] AC-3: `AnnotatedText` drops the trailing lead-in fragment (or trims a trailing dangling preposition) when `hasContent` is false. Shipped alongside `FIX-ANNOTATEDTEXT-REMAINDER-DUP-001` (same file, same session) as a new shared `stripDanglingLeadIn()` in `app/lib/citations.ts`, used by both `AnnotatedText.tsx` and `annotateTextPlain`. Verified via a standalone reproduction (`"...approved it at "` → `"...approved it"`), not against real data — current backend extraction (`extract_annotated_text`/`extract_annotated_text_from_citations`) never actually produces a reference with seconds/label/provenance *all* absent (both have their own `continue`-and-skip guard for that case), so this is defensive against malformed/legacy `references` data, same posture as the sibling fix.
- [x] AC-4 (redefined): the literal Aug 25, 2026 symptom this AC named ("partnership at  and agreed...", double space) was traced — see #61's commit message — to a *different* mechanism than this component: `Meeting.logline` rendered as bare plain text at `MeetingCard`/city-page/email sites with no way to splice its citation gap back in. That's a distinct bug, fixed separately in `FIX-LOGLINE-CITATION-SPLICE` (PR #63, shipped). This story's own AC-1–AC-3 fixes are in the `AnnotatedText`/`TimestampLink`/`page.tsx` paths actually used on the meeting *detail* page, verified via `npx tsc --noEmit`/`npm run lint`/`npm run build` (all clean) plus the standalone reproductions noted above — a live page load wasn't repeated since the specific reported symptom is confirmed to live in the already-fixed sibling story, not here.

#### FIX-ANNOTATEDTEXT-REMAINDER-DUP-001 — Summary text re-emitted inside a paragraph when a reference is dropped

**Status:** ✅ Done

**As a** reader of a meeting summary
**I want** each sentence to render exactly once
**So that** I don't see the same words twice in one paragraph

`app/components/AnnotatedText.tsx:51-62`: `consumed` sums `textBefore.length` only over refs surviving `isValidRef` (`:17-23`, which checks nothing but `typeof textBefore === "string"`), then `remainder = text.slice(consumed)`. Any dropped/malformed ref under-counts `consumed`, so the remainder re-emits already-rendered text. This may account for some of what read as tier-level duplication (TL;DR/Summary/Timeline, see `FEAT-MEETING-TIER-DEDUP-001` below) — check this bug first before assuming the tiers themselves are the problem.

**Root cause, confirmed:** the length-sum is the *surviving* refs' own lengths after filtering — since each surviving ref's `textBefore` is authored as *its own* individual span (not shifted to account for a dropped neighbor), the sum under-counts by exactly the dropped entry's length, and slicing `text` at that under-counted offset lands mid-span. Reproduced with a minimal 3-citation example (dropped middle entry): old code rendered `" seconded the motion. Remainder text here."`, duplicating `"seconded the motion."` from the citation rendered just above it.

**Scope note, stated plainly:** both current backend extraction functions (`extract_annotated_text`/`extract_annotated_text_from_citations` in `city-council-transcriber/src/summarizer.py`) only add an entry to `references` when its citation was actually located, advancing their own cursor exactly that far — so in normal operation every entry that reaches the frontend already satisfies the "runs-in-JSON" invariant on its own, and the old length-sum was harmless. This fix is a defensive correctness fix against malformed/legacy `references` data, not a fix for a bug reproduced against real production data. It is **not** the root cause of Aaron's TL;DR/Summary repetition complaint — that remains attributed to the tier-design overlap tracked in the parked `FEAT-MEETING-TIER-DEDUP-001` below.

**Fixed:** new `findRefCursor(text, refs)` in `app/lib/citations.ts` — walks `refs` in order, locating each one's `textBefore` via `text.indexOf(ref.textBefore, cursor)` from a running cursor (rather than trusting array order + length), so a gap from any dropped entry self-corrects instead of compounding. Falls back to treating an unfindable chunk as adjacent to the current cursor (best-effort, matching the old behavior for that one ref only) rather than losing track of everything after it. Used by both `AnnotatedText.tsx` (JSX) and `annotateTextPlain` (plain-string, `app/lib/citations.ts`) — the two consumers shared the identical bug, so both needed the same fix.

**Acceptance Criteria:**
- [x] AC-1: `consumed` is derived from the refs actually rendered, or from an explicit cursor advanced during render.
- [x] AC-2: A malformed/dropped ref cannot cause text to render twice — verified via a standalone reproduction (see "Root cause" above). This repo has no test runner configured (no `jest`/`vitest` in `package.json`), so verification is `npx tsc --noEmit` + `npm run lint` + `npm run build` (all clean) plus the reproduction script run directly under `node` (not committed).

**Files Modified:** `app/lib/citations.ts` (new `findRefCursor`, used by `annotateTextPlain`), `app/components/AnnotatedText.tsx` (same fix, JSX path).

#### FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001 — Normalize + highlight city/topic search matches

**Status:** ✅ Done

**As a** site visitor searching a city's meetings or topics
**I want** my query to match regardless of punctuation, and to see why a result matched
**So that** I can trust the search instead of wondering if it's broken

User-reported (2026-09-08): searching "data center" doesn't find "data-center"; results don't highlight the matched text; a match in a field not shown on the card ("Poudre" — the river's name) gives no indication of why that result appeared. Previous state — `app/components/MeetingFilter.tsx:44-51`:
```ts
const haystack = `${m.title} ${m.summary ?? ""} ${m.logline ?? ""}`.toLowerCase();
return haystack.includes(q);
```
`app/components/TopicsFilter.tsx:41-48` was the same design over `name + statusSummary + mostRecentActivity`. No fuzzy matching, no tokenization, no highlighting anywhere.

**Fixed:** new `app/lib/search.ts` — `normalizeForSearch()` folds case and every run of non-alphanumeric characters (hyphens, underscores, punctuation, whitespace) to a single space; `tokenizeQuery()` splits a query into deduped normalized tokens; `matchesAllTokens()` requires every token as a substring somewhere in the normalized haystack (AND semantics, order-free — verified "data center" matches "data-center"/"data  center"/"Data Centers", and "center data" matches "Data Centers" too). `findHighlightRanges()` reuses the same normalized-index → original-index mapping technique built earlier this session for `findRefCursor` (`app/lib/citations.ts`) and the transcriber's whitespace-anchor fallback, so a match found in normalized space (where "data-center" and "data center" look identical) highlights the correct characters in the real, differently-punctuated, unmodified text. New `HighlightedText.tsx` renders any string with `<mark>` around matched ranges — no client-only hooks, safe from a server or client component alike; `tokens` defaults to `[]` so every call site that doesn't pass it renders unchanged.

`MeetingFilter`/`TopicsFilter` both switched their filter predicate from the old `haystack.includes(q)` to `matchesAllTokens`, and now pass `tokens` down to `MeetingCard`/inline card JSX for highlighting. **Correctness trap caught before it shipped** (flagged by review): `MeetingCard` displays `annotateTextPlain(meeting.logline, meeting.tldrReferences)` — the citation-spliced string — not the raw `logline` field `MeetingFilter` matches against. Highlight ranges are computed against the *displayed* string (`displayText`, built once and reused for both rendering and AC-3's snippet check), not the raw field — computing against the raw field and applying to the spliced one would highlight the wrong character offsets once a citation is inserted, the same class of bug as `FIX-ANNOTATEDTEXT-REMAINDER-DUP-001` earlier this session.

AC-3: `MeetingCard` shows title + (logline OR summary, never both) — so `summary` is the one field that can hold a match invisibly when `logline` is present. Rather than trying to attribute which token matched which field (ambiguous when tokens are split across fields), the check is: if `${title} ${displayText}` combined doesn't already satisfy every token — and it's guaranteed the *full* combined haystack does, since `MeetingFilter` only renders matching cards — the match must be hiding in `summary` alone. `buildMatchSnippet()` then excerpts ~50 chars around the first match, with ellipsis, rendered highlighted under a "Matches in summary: …" line. `TopicsFilter`'s three searched fields (`name`/`statusSummary`/`mostRecentActivity`) are all already visible on its card, so no AC-3 case applies there — highlighting alone (AC-2) covers it.

**Acceptance Criteria:**
- [x] AC-1: Shared normalization + matching util (`app/lib/search.ts`), used by both `MeetingFilter` and `TopicsFilter`. Verified via a standalone reproduction script (not committed, no test runner in this repo) covering the exact cases named in this AC, plus a negative case and a highlight-range-across-a-hyphen mapping check.
- [x] AC-2: Matched terms visibly highlighted (`HighlightedText.tsx`, used in `MeetingCard.tsx` and `TopicsFilter.tsx`).
- [x] AC-3: A hidden-field match shows a short excerpt (`MeetingCard.tsx`'s `hiddenSummaryMatch`).
- [x] AC-4: No fuzzy/trigram matching added — exact substring per normalized token, as scoped.

**Files Modified:** `app/lib/search.ts` (new), `app/components/HighlightedText.tsx` (new), `app/components/MeetingFilter.tsx`, `app/components/MeetingCard.tsx`, `app/components/TopicsFilter.tsx`.

#### FEAT-SEARCH-SERVERSIDE-SURFACE-001 — Expand search to summary items/topics, move server-side

**Status:** 📋 Not started

**As a** site visitor
**I want** search to see key decisions and action items, not just the title/summary/logline blurb
**So that** a topic discussed in the meeting but not mentioned in the blurb still turns up

User-reported (2026-09-08): "data centers doesn't show up in action items, key decisions, or [reference section]" for the Aug 26 meeting. `MEETING_CARD_SELECT` (`app/lib/cityData.ts:165-172`) fetches only `slug, status, date, title, logline, summary` — `MeetingSummaryItem`, `TopicSummary`, and `InterestArea` content are never fetched onto the city page, so they're unsearchable there. Depends on `FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001` shipping first (same matching semantics, larger surface).

**Acceptance Criteria:**
- [ ] AC-1: Searchable surface includes `MeetingSummaryItem` text (key decisions, action items, timeline bullets) and `TopicSummary` titles/key points.
- [ ] AC-2: Matching moves server-side into `app/lib/cityData.ts` — closes AC-6.2 above (deferred in `FEAT-MEETINGFILTER-STATUS-001`) and the in-code note at `MeetingFilter.tsx:17-22`. Removes the current cost of serializing every meeting's full `summary`/`logline` (`@db.Text`) into the RSC payload purely to make it searchable — relevant at Seattle's volume.
- [ ] AC-3: Server-side matching reproduces the token-AND/punctuation-folding semantics from `FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001` — likely Postgres FTS or `pg_trgm`, neither of which exists today (verified: no `to_tsvector`/`tsquery`/`pg_trgm`/`ILIKE`/`$queryRaw`, no Prisma `contains`/`mode: "insensitive"`, no `previewFeatures` on the generator, no text index on `Meeting`). Adding either requires a migration.
- [ ] AC-4: Filter state syncs to the URL so a search is linkable — closes AC-6.3 above. Needs a Suspense boundary around `useSearchParams` in `app/[state]/[city]/page.tsx`.
- [ ] AC-5: Match-context snippets extend to the newly searchable fields ("matches in Key Decisions: …").

#### FEAT-VIDEO-POSTER-001 — Video thumbnail instead of a black first frame

**Status:** 🔄 AC-1/AC-3 shipped for YouTube; AC-2 (mp4 poster) investigated, genuinely blocked — see below

**As a** site visitor viewing a meeting page
**I want** to see a thumbnail before I press play
**So that** the video area doesn't look like a broken black box

User-reported (2026-09-08). No poster exists anywhere: `app/components/YouTubePlayer.tsx:85-90` renders an empty `aspect-video` div and injects the iframe from `useEffect` after the IFrame API loads; the mp4 `<video>` at `app/components/VideoPlayer.tsx:71-77` has `preload="metadata"` and no `poster`.

**AC-1 implemented with one deliberate deviation from the literal wording.** "Click-to-load" (a lazy-load facade deferring the IFrame API/player mount until the user clicks) was rejected: `VideoSyncProvider.seekTo()`/`play()` (used by every in-page citation timestamp via `TimestampLink`) silently no-op until `registerPlayer()` has fired from the real player's `onReady`. Deferring that behind a click would break "click a transcript citation before ever pressing play" — a more central feature than the poster is cosmetic, and no smaller in scope than the poster itself to fix in tandem. Instead, the API/player still load eagerly exactly as before (registration timing unchanged), and a real thumbnail (`https://img.youtube.com/vi/<id>/hqdefault.jpg`, via `next/image` with a new `images.remotePatterns` entry in `next.config.ts` — no CSP configured anywhere in this repo, so no conflict) is layered on top of the loading iframe and removed once `onReady` fires. This fully addresses the "looks like a broken black box" complaint without touching load or registration timing.

**AC-2 investigated, genuinely blocked — correcting an initial wrong assumption first.** An early pass at this write-up claimed `videoProvider: "mp4"` was "effectively unused in production," based on a grep of `src/`/`webapp/` in `city-council-transcriber` that found no `"mp4"` assignment. That grep missed the real write path: **`export_transcription_data.py`** (top-level, not under `src/`) is what actually populates `video_provider` before it reaches Neon — `_resolve_video()` (`export_transcription_data.py:375-397`) derives `"mp4"` from a `webpage_url` matching known self-hosted-video hosts. Queried the real Neon data directly rather than trust the grep further: **100 of 381 meetings with a provider set are `mp4`** (`granicus`: 101, `youtube`: 24, `null`: 156) — all 100 sampled point at `video.seattle.gov`. Not a dead path; it's Seattle's entire video provider. Correcting this here rather than leaving the wrong claim standing, per this session's own established practice.

Given that, a client-side fix was worth checking before writing AC-2 off: browsers can grab a video frame into a `<canvas>` and read it back as a poster image (seek past a source's opening black slate, `drawImage`, `toDataURL()`) — no server pipeline needed. Verified empirically against a real URL rather than assumed: `curl -sI -H "Origin: https://<this site>" https://video.seattle.gov/media/council/land_052026_2822617.mp4` returns `Access-Control-Allow-Origin: https://www.seattlechannel.org` — scoped to Seattle's own player origin, not ours. Reading a canvas fed by a cross-origin `<video>` without a matching CORS grant taints the canvas and `toDataURL()`/`toBlob()` throws `SecurityError` — confirmed blocking, not theoretical, for 100/100 of the real mp4 rows sampled.

That leaves only a server-side option: have `city-council-transcriber`'s pipeline ffmpeg-grab a frame a few seconds past the start (avoiding a black opening slate), host it somewhere reachable by the frontend, and add a Prisma column to carry its URL. That's a real, separate scope — a new pipeline step, new storage/hosting decision, and a schema migration — not a "add a `poster` attribute" fix, and not something to fold into this story unilaterally. Flagged as its own follow-up rather than built or waved off.

**Acceptance Criteria:**
- [x] AC-1: YouTube shows a real thumbnail (not click-to-load — see note above) until the API resolves.
- [ ] AC-2: mp4 poster — not implemented. Client-side frame-capture is blocked by CORS on the real data (verified against `video.seattle.gov`, Seattle's entire mp4 fleet — 100 meetings); a working fix needs a server-side frame-grab step in `city-council-transcriber` plus a new Prisma column, scoped as a follow-up story, not built here.
- [x] AC-3: A meeting with no derivable thumbnail degrades to today's behavior — true by construction (mp4 path is untouched; YouTube's overlay simply doesn't render once `ready`).

**Files Modified:** `next.config.ts` (`images.remotePatterns` for `img.youtube.com`), `app/components/YouTubePlayer.tsx`.

#### FIX-EXTERNAL-VIDEO-LABEL-001 — Label external video links (e.g. FCTV) and note VPN blocking

**Status:** 🚫 On hold (2026-09-09, user decision) — deprioritized, not built. Not blocked on anything technical; parked by choice.

**As a** site visitor clicking an external video link
**I want** to know where it's taking me
**So that** I'm not confused by an unfamiliar name like "FCTV" or a link that fails silently over VPN

User-reported (2026-09-08): didn't know what FCTV was (Fort Collins's city cable TV); the livestream link was unreachable with VPN on. `VideoPlayer.tsx:129-136` → `ExternalLinkVideo` links out with no context about the destination.

**Open design question, unresolved:** `videoProvider` (`youtube`/`mp4`/`granicus`/unknown-fallback) has no per-city "friendly source name" concept anywhere in the codebase today — nothing maps to "FCTV." AC-1 as written needs either (a) new per-city config threaded from `city-council-transcriber` through Neon to the frontend, or (b) a generic hostname-derived label ("Watch on fctv.org ↗") requiring no schema change but less polished than the plan's example copy. Flagged to the user rather than picked unilaterally; deferred instead of decided.

**Acceptance Criteria:**
- [ ] AC-1: External video links name their source and note that they leave the site (e.g. "Watch on FCTV (Fort Collins city cable) ↗").
- [ ] AC-2: Copy notes that some city streams block VPN/out-of-region traffic. The VPN block itself is the source city's, not ours — do not attempt to proxy around it.

#### FIX-STALE-AGENDA-PREDICATE-001 — "Agenda fetch looks stuck" alert overstates its evidence

**Status:** ✅ Done

**As an** admin reading the daily digest
**I want** the "agenda fetch looks stuck" warning to only claim what's actually provable
**So that** I can trust the diagnostic instead of chasing a claim the data doesn't support

**Investigated, and the original framing turned out to be half right.** The plan suspected `agendaLastFetchedAt` meant "this row was ever touched" (set on every stub upsert, `city-council-transcriber/src/neon_writer.py:1283`'s `ON CONFLICT` branch) rather than "a fetch was attempted." Traced every production caller of `_upsert_stub_meeting_row`/`upsert_meeting_documents_batch` in `city-council-transcriber` to check this precisely:
- The discovery scraper (`upcoming_scraper.py`'s per-city loop) only calls the stub-upsert path after a non-raising `fetch_upcoming_documents()` call, gated by `fetch_documents` — which defaults `True` and is never set `False` by any real caller (only 2 test files do). So this path's `agendaLastFetchedAt` write is always downstream of a real attempt in production. **Not a live bug** — same "correctly gated by its own caller, just looks unconditional in isolation" shape as `FIX-ANNOTATEDTEXT-REMAINDER-DUP-001`'s and `FIX-TIMESTAMP-LABEL-EMPTY-001`'s "theoretical, not reproduced" findings earlier in this same session.
- The ongoing refresh loop (`run_document_refresh_for_city` → `_sync_docs_refresh_batch_to_neon`) only syncs `synced_this_cycle`, built strictly from candidates whose `fetch_meeting_documents()` call didn't raise this cycle — **but** that function returns normally (not raising) in a second case besides "genuinely fetched, nothing there": when it can't resolve the meeting to a source event at all (`result["error"] = "Could not resolve meeting to CivicClerk event..."`, logged via the success branch, per the codebase's own comment at `upcoming_scraper.py:3762-3766`). The refresh loop's caller doesn't branch on `result.get("error")` before adding to `synced_this_cycle` — so **this is the live gap**: `agendaLastFetchedAt` (and by extension the digest's "the agenda source was scraped" claim) doesn't actually distinguish "reached the source, found nothing" from "never resolved the source at all."

**Fix chosen, scoped deliberately small (per AC-1's own second branch):** rather than restructure the Python refresh loop's success/failure semantics — which several other things key off (`synced_this_cycle` also drives the local backoff-attempt marker, unrelated to this Neon column, so a change there risks widening scope into `FIX-DOCS-REFRESH-DEAD-CANDIDATES-001`'s territory) — corrected the claim in `city-council-transcripts` to state only what's provable from the column: "the agenda source was scraped" (implies reached) became "a document/agenda refresh ran... this can mean the source had nothing posted, or that the scraper couldn't resolve this meeting to a source listing at all." Same correction applied to `findStaleAgendaMeetings`'s own docstring.

**Acceptance Criteria:**
- [x] AC-1: the digest copy is corrected to match what the column proves (second branch — the predicate/column itself is left alone, since restructuring the Python write path was judged out of proportion to what this story asked for; the write-path ambiguity is now documented in both places so a future session doesn't have to re-derive it).

**Files Modified:** `app/lib/adminDigest.ts` (digest copy + `findStaleAgendaMeetings` docstring). No changes needed in `city-council-transcriber` — investigated, not touched.

### Phase 2 — Hot topics on the Fort Collins page (manual curation)

#### FEAT-FORTCOLLINS-INTEREST-AREAS-001 — Curate and generate Fort Collins interest areas

**Status:** 📋 Not started

**Repo:** `city-council-transcriber`.

**As a** Fort Collins resident
**I want** the topics the city cares about (data centers, Flock cameras, etc.) to actually be tracked
**So that** the topics page isn't empty and hot-issue summaries have something to show

Root cause: `config/cities/fort-collins/interest_areas.json` is `{"schema_version": "2.0.0", "history": [...], "custom": []}` — empty. Zero interest areas configured ⇒ zero generated ⇒ empty topics page. Monterey Park's equivalent is populated (Spending, Barnes Park Pool, Data Centers, Bike Lanes), which is why its topics page works. Note `config/cities/fort-collins/topics.json` is a different, unrelated thing (the generic per-meeting `TopicSummary` taxonomy, not city-level topic rollups).

**Acceptance Criteria:**
- [ ] AC-1: `config/cities/fort-collins/interest_areas.json` gains curated areas with descriptions (v2.0.0 schema: `id`, `name`, `description`, `version`, `history`, `global_topic_id`). Starting set from the review session: Data Centers (reuse `global_topic_id: "data_centers"`), Flock Cameras / Surveillance, Homelessness & Shelter Siting, Montava, Poudre River. Confirm the list before generating — a bad list is worse than none.
- [ ] AC-2: `scripts/generate_interest_areas.py` is run across the full Fort Collins archive. Watch the storage root: `--city fort-collins` (`scripts/generate_interest_areas.py:115-130`) resolves `storage_base = STORAGE_BASE / args.city` where `STORAGE_BASE` is the repo-local `storage/` (`:31`) — it does not consult `get_storage_root()`/`storage_config.json`. The repo-local `storage/fort-collins/` holds only 3 meetings; the real archive is on the external drive (`storage_config.json`'s `storage_root`, `/fort-collins/`, 2025-07 → 2026-09). Either invoke as `CITY=fort-collins python scripts/generate_interest_areas.py --storage "<archive>/fort-collins"` (honors `--storage` when `--city` is unset, `CITY` still drives per-city config loading via `interest_area_summarizer.py:48-64`), or — preferred — make `--city` respect `get_storage_root()` (`src/storage.py:109`) so this doesn't trap the next city. Dry-run first (`--dry-run`).
- [ ] AC-3: Results published to Neon via `write_interest_areas` (`src/neon_writer.py:594`), verified as `InterestArea` rows with non-null `statusSummary`, and `InterestAreaMeetingStatus` rows for meetings that discussed them.
- [ ] AC-4: `/co/fort-collins/topics` renders the curated areas, and each `/topics/[slug]` shows a cross-meeting timeline.
- [ ] AC-5: The runbook for adding a city's interest areas is written down (transcriber's `AGENTS.md` or `docs/`) — this gap silently made Fort Collins look broken and will recur for the next city otherwise.

#### FEAT-CITY-HOT-TOPICS-001 — Surface hot topics on the city page

**Status:** 📋 Not started

**As a** Fort Collins resident visiting the city page
**I want** to immediately see what the hot issues are (data centers, Flock cameras) with a one-line summary
**So that** I don't have to dig through every meeting to find out what's being discussed

`app/[state]/[city]/page.tsx` renders: h1 → `recentMeetingsSummary` card (`:71-80`) → city summary (`:101`) → `SubscribeForm` (`:103-109`) → Meetings section (`:111-121`) → `AIDisclaimer`. It never calls `getInterestAreasForCity` and contains zero links to `/topics` — neither does `MeetingCard.tsx` or `CityCard.tsx`. The only entry point is the header tab (`SiteHeader.tsx:64-69`), which renders only once already inside a city — which is why the topics nav shipped in prior PRs but the user still never found it.

**Acceptance Criteria:**
- [ ] AC-1: A "What's being talked about" block on the city page, inserted after the recent-activity card (`page.tsx:80`). Each entry: topic name, one-line `statusSummary`, `meetingsDiscussed`/`mostRecentActivity`, linking to `/topics/[slug]`. Ends with a "See all topics →" link — the city page's first path into `/topics`.
- [ ] AC-2: Reuses the existing `getInterestAreasForCity` (`app/lib/cityData.ts:322-390`) added to the `Promise.all` at `page.tsx:50-53`, with a narrowed select (it currently returns the full meeting-status join).
- [ ] AC-3: Curation is expressed through the existing `InterestArea.sortOrder` (and `source`) columns, set upstream from config. No schema change.
- [ ] AC-4: Cities with no interest areas (every city before `FEAT-FORTCOLLINS-INTEREST-AREAS-001`-style work runs for them) render nothing — no empty shell.
- [ ] AC-5: Revalidation — `app/api/revalidate/route.ts:60` revalidates the city path and `/topics` but nothing triggers it on interest-area writes, and the city page is `revalidate = false` (`page.tsx:18-29`). Either the transcriber's interest-area write calls revalidate, or the block gets a time-based revalidate. Same known gap documented at `topics/[slug]/page.tsx:11-17`.

#### FIX-INTERESTAREA-COUNT-CONSISTENCY-001 — Topics index and detail page disagree on meeting counts

**Status:** ✅ Done

**As a** site visitor comparing a topic's index card to its detail page
**I want** the same meeting count and the same discussed/not-discussed filter in both places
**So that** the numbers don't contradict each other

Two inconsistencies, which become visible the moment a city has real topics: `getInterestAreasForCity` filters `meetingStatuses: { where: { discussed: true } }` (`cityData.ts:351`); `getInterestArea` had no such filter (`cityData.ts:426`), so the detail-page timeline could include `PREVIEW`-phase/not-discussed rows whenever they carry a `summary` (`topics/[slug]/page.tsx:69`). Separately, "how many meetings" was computed two ways: the index recomputed as `confidence >= 0.5` over `area.meetings` (`topics/page.tsx:51-53`), the detail page rendered the DB's `area.meetingsDiscussed` (`topics/[slug]/page.tsx:107-115`) — two independent definitions of the same number.

**Fixed:** `getInterestArea`'s `meetingStatuses` select now carries the same `where: { discussed: true }` as `getInterestAreasForCity`, so both queries return the identical set of meetings for a given area (AC-1). The index page's `discussedCount` no longer recomputes a confidence threshold — it now reads `area.meetingsDiscussed ?? 0`, the same DB field the detail page already rendered, so both pages show one number for the same area (AC-2). The `?? 0` coalesce matches the detail page's `!== null` gate: `TopicsFilter` only renders the count badge when it's `> 0`, so a null/zero area shows nothing on either page, same as before.

**Acceptance Criteria:**
- [x] AC-1: One definition of "discussed," applied in both queries.
- [x] AC-2: One count, rendered identically on index and detail.

**Files Modified:** `app/lib/cityData.ts` (`getInterestArea`'s select), `app/[state]/[city]/topics/page.tsx` (`discussedCount` derivation).

### Phase 3 — Meeting page polish

#### FIX-MEETING-LAYOUT-ALIGNMENT-001 — Meeting page padding/alignment/blank-space cleanup

**Status:** 📋 Not started

**As a** site visitor reading a meeting page
**I want** sections to be consistently spaced and sized to their content
**So that** the page doesn't look unfinished with large blank areas and misaligned headings

User-reported (2026-09-08): "layout could use polish… things are placed in weird spots… lots of blank space and not aligned." All in `app/transcripts/[...slug]/page.tsx` unless noted:
- Inconsistent padding: `:458` (TL;DR) and `:499` (Topics) are `<section className="p-6">` with no border/background; Summary (`:510`), Transcript (`:690`), Video (`:708`), Reference (`:725`) have none — the top two headings are inset 24px from every heading below with nothing visible to justify it.
- Blank space under TL;DR: `TopicsPanel.tsx:81` pins `contentClassName="md:h-[220px] md:overflow-y-auto"`. The left grid cell holds a 1–3 sentence logline and stretches to that row height — directly reversing `TabbedPanel.tsx:65-67`'s own comment that only the active panel renders "so the container sizes to the tab in view rather than reserving the height of the tallest tab."
- Mostly-empty first column: `:685` is `lg:grid-cols-3` where column 1 is a collapsed `<details>` (a single "▶ Transcript" line) next to a tall Reference column — ~90% whitespace on load.
- Empty third column with no video: the header link at `:425` needs only `videoUrl`; the player at `:706` needs `videoUrl && videoProvider`. A row with a generic `videoUrl` but no `videoProvider`/legacy URL renders the header link and no player.
- `DocumentsPanel.tsx:121-123` uses an `h-full min-h-0` chain but its parent `<section>` (`:725`) sets no height, so tab content scrolls in an arbitrary box instead of sizing to content.
- `<p className="flex gap-2 items-start">` at `:519` combined with `max-w-prose` at `:513` lets the timestamp column eat into the text measure.

**Acceptance Criteria:**
- [ ] AC-1: One padding/container convention across all top-level sections.
- [ ] AC-2: The Topics panel sizes to content; no fixed `md:h-[220px]`.
- [ ] AC-3: The bottom grid reflows so a collapsed transcript and a missing video don't leave dead columns.
- [ ] AC-4: Verified against the real Fort Collins Sept 1, 2026 meeting page (has video, unreviewed transcript).

#### FIX-REFERENCE-HEADING-001 — "Reference" section heading doesn't match its content or its own link text

**Status:** ✅ Done

**As a** site visitor
**I want** the section labeled "Reference" to have a name that describes Documents/Minutes/Agenda/Votes
**So that** I understand what it holds before clicking in

`<section id="reference"><h2>Reference</h2>` (`page.tsx:725-726`) holds Documents/Minutes/Agenda/Council Members & Votes tabs — source material, not citations. The only in-page link to it (`page.tsx:604-609`) already reads "View documents & minutes ↓" — the heading and its own anchor disagree.

**Fixed:** took AC-1's first option (heading matches anchor text) over dropping/promoting the tabs, since the latter is a bigger visual-design change that belongs with the Phase 3 layout work (`FIX-MEETING-LAYOUT-ALIGNMENT-001`), which itself needs a human looking at the real page rather than a blind implementation. Heading changed to "Documents & Minutes"; `id="reference"` left untouched (AC-2) so the anchor and any external links keep landing correctly — confirmed no other reference to the old heading text anywhere in the codebase (`grep` for `"Reference"`/`>Reference<`, zero hits).

**Acceptance Criteria:**
- [x] AC-1: The heading matches the anchor text ("Documents & Minutes").
- [x] AC-2: `id="reference"` preserved.
- [x] AC-3: Noted directly in the code comment above the section — `MeetingSummaryItem.references` is unrelated, not touched here.

**Files Modified:** `app/transcripts/[...slug]/page.tsx`.

#### FIX-SUMMARY-GATE-NULL-001 — Summary blocks silently dropped when `meeting.summary` is null

**Status:** ✅ Done

**As a** site visitor
**I want** the Summary section to render whenever there's summary content to show
**So that** I don't see a placeholder/fallback when real content exists but wasn't gated correctly

`page.tsx:512` (now `:518`) branches on `meeting.summary` but renders `summaryBlocks`. When `summary` is null and `SUMMARY_BLOCK` rows exist, the blocks are dropped and the page falls through to topicSummaries or a placeholder.

**Investigated the write side before fixing** (same pattern as the two stories above this session): checked whether `city-council-transcriber` can actually produce `SUMMARY_BLOCK` rows (from `summary.overview_blocks`) while leaving `Meeting.summary` (from `summary.overview`) null. Found `_ensure_overview_blocks()` and 3 separate call sites (`src/summarizer.py:1720`, `:1778`, `:2912`) that derive `summary.overview = "\n\n".join(b["text"] for b in summary.overview_blocks)` whenever blocks are populated — so in current code, the two are kept in sync by construction, same "theoretical, not reproduced" shape as this session's other findings. Fixed anyway: the corrected gate is strictly more correct regardless of current reachability (a stale/historical row, or a future pipeline change that breaks the sync, both stay handled), and the change carries zero regression risk — the inner ternary at the original `:558` (now `:520`) already re-checks `summaryBlocks.length > 0` independently before ever touching `meeting.summary!`, so widening the outer gate can't newly reach that non-null assertion with a null value.

**Acceptance Criteria:**
- [x] AC-1: The gate tests what is actually rendered (`summaryBlocks.length > 0 || meeting.summary`).

**Files Modified:** `app/transcripts/[...slug]/page.tsx`.

### Parked — write the story, don't build it yet

#### FEAT-MEETING-TIER-DEDUP-001 — TL;DR / Summary / Timeline repeat the same content

**Status:** 📋 Parked by decision (2026-09-08) — revisit as an alternate view, not a replacement, so the current page is never regressed.

**As a** reader of a meeting page
**I want** the TL;DR, Summary, and Timeline to each add something new
**So that** I'm not reading the same fact (e.g. the Montava project) restated three times

User-reported (2026-09-08): "TLDR and timeline and summary — e.g. Montava is in all 3… doesn't make sense for a user to read all 3 things, there is repetition," plus a request to apply "bite/snack/meal" content design — a high-level list that expands for detail, rather than a wall of text.

Facts for whoever picks this up:
- `Meeting.logline` → "TL;DR" (`page.tsx:460-482`). `Meeting.summary` → "Summary" (`page.tsx:512-554`). The "Timeline" tab is `MeetingSummaryItem` rows of type `TIMELINE_BULLET` (`page.tsx:310-342` → `TopicsPanel`).
- `Meeting.timelineBullets` is a dead column — referenced only in `prisma/schema.prisma:99`, one migration, and a comment at `cityData.ts:161`. Changing the timeline means touching `SUMMARY_TYPE_ORDER` (`page.tsx:42-48`), `HIDDEN_SUMMARY_TYPES` (`page.tsx:30`), and `labels.ts:42` — not that column.
- The adjacency is what makes it read as repetition: `TIMELINE_BULLET` sorts first (`page.tsx:43, :335-342`) and `TabbedPanel.tsx:26` defaults to tab 0, so a chronological retelling renders immediately right of the TL;DR, and the prose Summary repeats it again below.
- The bite/snack/meal vocabulary already exists in this product — `city-council-transcriber/src/upcoming_summarizer.py::generate_alert_tiers` feeds `emails/UpcomingMeeting.tsx`. An alternate meeting view could reuse that framing.
- Check `FIX-ANNOTATEDTEXT-REMAINDER-DUP-001` first — some of the perceived duplication may be that bug, not the tier design.

Direction if built: give each field one job — `logline` = the one line, `TIMELINE_BULLET` = the navigational spine with timestamps, `summary` = collapsed/secondary — with progressive disclosure. Whether generation prompts also change (transcriber side, requires regenerating existing meetings) is a separate decision, deliberately not taken now.

### Product questions raised in this session — not planned work

Recorded so they aren't silently converted into engineering without a product decision:
- Who is Counciloris for — a resident who wants "what's going on" vs. an organizer who wants "are there protest plans, is anyone showing up"? Possibly a different product.
- Alert fatigue vs. coverage — "the problem of constant updates is you stop reading it." Idea: a "tell me when it's a hot issue" subscription tier distinct from per-meeting alerts (builds on `AlertFrequency`, needs a definition of "hot" first).
- Using search queries as a curation signal for future users — requires query logging, which doesn't exist; also a privacy decision (cf. `US-PREF-003`'s stated bar).
- How much topic curation should be manual vs. AI vs. supervised — `FEAT-FORTCOLLINS-INTEREST-AREAS-001` answers this as "manual for now" for one city; it doesn't answer it at scale.
- Hyperlocal relevance (e.g. a homeless shelter across the street mattering only to immediate neighbors, who'd search a landmark name like "church") — a search-quality problem, covered by `FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001`/`FEAT-SEARCH-SERVERSIDE-SURFACE-001`, not a curation problem.
- Distribution — posting summaries to the Fort Collins subreddit/Nextdoor, both to gauge interest and to reach people. Not engineering work; a go-to-market decision.

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
