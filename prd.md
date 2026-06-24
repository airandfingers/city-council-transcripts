# Product Requirements

## Implementation Status Summary

- ✅ US-LOCALDB-001 — Local Postgres for development
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
