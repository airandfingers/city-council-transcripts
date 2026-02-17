---
spec: city-site-structure
phase: requirements
created: 2026-02-13T00:00:00Z
---

# Requirements: City Site Structure

## Goal
Evolve the baseline app into a small, statically-generated city directory with a home page, city detail pages, and meeting cards, while preserving Next.js App Router best practices.

## Scope Summary
- Home page at `/`
- City pages at `/{state}/{snake-cased-city}`
- Seed cities:
  - Monterey Park, CA
  - Fort Collins, CO
- Dummy data functions that can later be swapped for DB-backed implementations

## Architecture Constraints
- The app uses Next.js App Router.
- Static generation must follow App Router conventions (for example, `generateStaticParams` + server data functions), which is the App Router equivalent of `getStaticProps`/`getStaticPaths`.

## User Stories

### US-1: Browse supported cities from Home
**As a** visitor  
**I want** to see a clean city directory on the home page  
**So that** I can quickly navigate to a city page

**Acceptance Criteria:**
- [ ] AC-1.1: Visiting `/` renders a section containing exactly 2 city cards.
- [ ] AC-1.2: The cards are for “Monterey Park, CA” and “Fort Collins, CO”.
- [ ] AC-1.3: Each city card includes:
  - city + state label
  - link to its city route
  - exactly 2 sentences of summary text (lorem ipsum allowed)
- [ ] AC-1.4: City cards use a Flexbox layout with:
  - two-column arrangement when viewport is at least 768px
  - one-column arrangement when viewport is under 768px
- [ ] AC-1.5: Home includes an “About” section with title and exactly 2 sentences of summary text.

### US-2: View city details and meetings
**As a** visitor  
**I want** a city page with summary and meeting list  
**So that** I can review available council meetings

**Acceptance Criteria:**
- [ ] AC-2.1: Dynamic routes resolve for:
  - `/ca/monterey-park`
  - `/co/fort-collins`
- [ ] AC-2.2: City page title is rendered as “{City}, {State}”.
- [ ] AC-2.3: City page includes one summary paragraph.
- [ ] AC-2.4: City page includes a one-column list of meeting cards.
- [ ] AC-2.5: Each meeting card includes:
  - title in format `City Council Meeting - Friday, Feb 13, 2026` (date varies by meeting)
  - one summary paragraph
  - “Full transcript” link pointing to `#`
- [ ] AC-2.6: Each seed city has at least one meeting card rendered.

### US-3: Static generation from dummy data boundary
**As a** developer  
**I want** route params and page data produced from dummy functions  
**So that** we can replace data sources later without rewriting pages

**Acceptance Criteria:**
- [ ] AC-3.1: Seed city and meeting data is defined in dedicated dummy server data functions (not hard-coded directly in page JSX).
- [ ] AC-3.2: Dynamic route params are statically generated from the same data source used by rendering.
- [ ] AC-3.3: Route segments are normalized to lowercase state and snake-cased city.
- [ ] AC-3.4: Unknown city routes return 404 behavior.
- [ ] AC-3.5: Data-layer function signatures are stable and replaceable with DB-backed versions.

### US-4: Accessibility and semantic structure
**As a** visitor  
**I want** semantic, readable content structure  
**So that** the pages are understandable and maintainable

**Acceptance Criteria:**
- [ ] AC-4.1: Pages use semantic sections (`main`, `section`) and logical heading order.
- [ ] AC-4.2: Links have descriptive text labels.
- [ ] AC-4.3: Content remains visible in both light and dark mode.

### US-5: Ralph quality-gate workflow
**As a** developer  
**I want** Ralph to enforce quality gates per iteration  
**So that** long-running loops are deterministic and safe

**Acceptance Criteria:**
- [ ] AC-5.1: Gate scripts exist for home page content/layout, city route/content behavior, and build/lint checks.
- [ ] AC-5.2: Each gate exits nonzero on failure and zero on success.
- [ ] AC-5.3: `scripts/validate/gates.json` registers each gate id and command.
- [ ] AC-5.4: End-of-iteration validation runs `node scripts/validate/run-gates.mjs --all`.
- [ ] AC-5.5: Ralph updates/adds gate scripts when acceptance criteria change.

## Out of Scope
- Real database integration
- Authentication/authorization
- Transcript detail page and real transcript URLs
- Advanced search/filtering UX

## Success Criteria
- Required routes render with expected content and layout behavior.
- Dynamic city routes are generated from dummy data via App Router static generation.
- All registered quality gates pass at end of iteration.
