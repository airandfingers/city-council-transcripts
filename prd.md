# Product Requirements

## Implementation Status Summary

- ✅ US-LOCALDB-001 — Local Postgres for development
- ✅ FIX-ALERT-AGEGATE-NULLMEETING-001 — Age-gate interest-area alerts with no meetingId
- ✅ FEAT-ADMIN-DIGEST-ALWAYS-001 — Route all automated admin alerts through the daily digest only
- ✅ FIX-ALERT-DEDUP-001 — Dedup repeat createMeetingUpdateAlert calls per meeting
- ✅ FEAT-EMAIL-UPCOMING-NOAGENDA-001 — Collapse redundant no-agenda copy in UpcomingMeeting email
- ✅ FEAT-MEETINGCARD-STATUS-CTA-001 — Gate "View summary & transcript" CTA on meeting status
- ✅ FEAT-MEETINGFILTER-STATUS-001 — Add status/upcoming filter to city meeting list (client-side scope)
- 📋 US-ALERT-001 — Subscribe to a city's upcoming agenda items
- 📋 US-ALERT-002 — Notify ahead of an upcoming vote
- 📋 US-ALERT-003 — Topic watch alerts
- 📋 US-PREF-001 — Optional topic preferences
- 📋 US-PREF-002 — "What's new since you last checked" digest
- 📋 US-PREF-003 — Tune suggestions from behavior, not just stated preference
- 📋 US-REEL-001 — Auto-generated highlight clips
- 📋 US-REEL-002 — Shareable / embeddable clip pages
- 📋 US-REEL-003 — Social-ready clip exports

## Active Stories

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

---

### FIX-ALERT-DEDUP-001 — Dedup repeat createMeetingUpdateAlert calls per meeting

**Status:** ✅ Done (AC-3.3 not done — no existing unit test suite for alerts.ts to extend)

**As an** admin
**I want** a given meeting's update alert to appear once, not once per reprocessing run
**So that** old meetings caught in a transcriber backfill don't resurface in my digest day after day

Root cause: `createMeetingUpdateAlert()` (`app/lib/alerts.ts:120-139`) has no idempotency/dedup check — every call (including repeat publish/backfill calls for a meeting whose content hasn't materially changed) creates a fresh `DRAFTED` `Alert` row. Since `FEAT-ADMIN-DIGEST-ALWAYS-001` sweeps all un-actioned `DRAFTED` alerts daily, a meeting reprocessed on multiple different days produces a new alert — and a new digest row — each time.

**Acceptance Criteria:**
- [x] AC-3.1: `createMeetingUpdateAlert` checks for an existing un-actioned (`DRAFTED`) alert for the same `meetingId`+`type` with equivalent content before creating a new one; if found and content is unchanged, no new alert is created.
- [x] AC-3.2: A genuine content change (e.g. a corrected summary) for the same meeting still produces an updated alert (content overwritten in place on the existing `DRAFTED` row) — this is dedup, not suppression of real updates.
- [ ] AC-3.3: Not done — no existing unit test suite for `alerts.ts` to extend; verified by code inspection + typecheck only.

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

## Backlog: PoC feedback Phases 4–6 (not yet built)

The PoC feedback session (2026-06) surfaced themes beyond what shipped in Phases 0–3 (homepage/nav/affordance cleanup, TLDR-first meeting pages, council member vote transparency, search/filter, and the slug-vs-filename naming fix). These stories capture the remaining themes as a backlog, sequenced behind Phase 3. They are intentionally **not implemented yet** — scope each into its own pass before building.

### Phase 4 — Alerts & subscriptions

Builds on the existing module spec at `specs/subscription/requirements.md` and `specs/subscription/design.md`, which already covers the base subscribe/confirm/unsubscribe flow (US-1–US-3 there). The stories below extend that module with the specific behavior PoC testers asked for: **alerting before** a vote happens, not after.

#### US-ALERT-001 — Subscribe to a city's upcoming agenda items

**Status:** 📋 Not started

**As a** resident who doesn't check the site regularly
**I want** to subscribe to a city and get notified about upcoming meetings
**So that** I don't have to remember to come back and check

**Acceptance Criteria:**
- [ ] AC-1.1: Builds on the `Subscriber` model from `specs/subscription/design.md` (email, cityId, confirmed, status).
- [ ] AC-1.2: A subscribed, confirmed resident receives an email digest before each upcoming meeting for their city, once an agenda is available.
- [ ] AC-1.3: Digest lists agenda items in plain language (reuse `app/lib/labels.ts` terminology), not raw agenda codes.

#### US-ALERT-002 — Notify ahead of an upcoming vote

**Status:** 📋 Not started

**As a** resident concerned about a specific issue (e.g. data centers, housing)
**I want** to be told *before* the council votes on it
**So that** I have a chance to act (show up, comment, contact my rep) while it still matters

PoC feedback was explicit that this is the single most valuable feature: *"the biggest thing is to alert AHEAD of time. If something already happened, what are you going to do about it?"*

**Acceptance Criteria:**
- [ ] AC-2.1: Requires agenda data to exist before the meeting (currently agenda/segment data is generated from the transcript *after* the meeting — this story needs an upstream agenda-ingestion path, scoped separately in `city-council-transcriber`).
- [ ] AC-2.2: A scheduled job detects newly-published agenda items matching a subscriber's watched topics/city and triggers a notification at least 48h before the meeting.
- [ ] AC-2.3: Notification states the item, the date, and a direct link to the (not-yet-held) meeting page.

#### US-ALERT-003 — Topic watch alerts

**Status:** 📋 Not started

**As a** resident who cares about specific issues, not every meeting
**I want** to watch a topic (e.g. "housing", "data centers") across all meetings for my city
**So that** I only get notified when something relevant comes up, not every meeting

**Acceptance Criteria:**
- [ ] AC-3.1: Extends the `Subscriber` model with a topic-tagging mechanism (free text or a fixed taxonomy — TBD during design).
- [ ] AC-3.2: Matches watched topics against `MeetingSummaryItem`/`MeetingSegment` tags or text at ingestion time.
- [ ] AC-3.3: A subscriber can manage (add/remove) watched topics without re-subscribing from scratch.

---

### Phase 5 — Personalization & preferences

#### US-PREF-001 — Optional topic preferences

**Status:** 📋 Not started

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
