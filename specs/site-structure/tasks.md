---
spec: site-structure
phase: tasks
total_tasks: 22
created: 2026-02-13T00:00:00Z
---

# Tasks: City Site Structure

## Phase 1: Make It Work (POC)

Focus: Validate end-to-end functionality. Hardcoded values OK, skip tests.

- [x] 1.1 Create data layer with seed cities and meetings
  - **Do**:
    1. Create `app/lib/cityData.ts` with City and Meeting types
    2. Implement `getSeedCities()` returning Monterey Park CA and Fort Collins CO
    3. Implement `getCityByParams(stateCode, citySlug)` returning City or null
    4. Implement `getMeetingsForCity(stateCode, citySlug)` returning Meeting[]
    5. Implement `getStaticCityParams()` returning array of {state, city} for generateStaticParams
    6. Each city gets 2-sentence lorem ipsum summary
    7. Each city has at least one meeting with formatted title "City Council Meeting - Friday, Feb 13, 2026"
  - **Files**: `app/lib/cityData.ts`
  - **Done when**: Data layer exports all 4 functions with proper types
  - **Verify**: `npx tsc --noEmit`
  - **Commit**: `feat(data): add dummy city data layer with seed cities and meetings`
  - _Requirements: AC-3.1, AC-3.2, AC-3.3, AC-3.5_
  - _Design: Data Model, Data-Layer API_

- [x] 1.2 Create home page with city cards
  - **Do**:
    1. Replace `app/page.tsx` content with city directory layout
    2. Import `getSeedCities` from data layer
    3. Render `<main>` with city cards section using Flexbox
    4. Each card: city/state label, link to `/{stateCode}/{citySlug}`, 2-sentence summary
    5. Add About section with title and 2-sentence summary
    6. Apply responsive Flexbox: 2-column at 768px+, 1-column below
  - **Files**: `app/page.tsx`
  - **Done when**: Home page shows 2 city cards and About section
  - **Verify**: `npm run build && curl -s http://localhost:3000 | grep -q "Monterey Park"`
  - **Commit**: `feat(home): add city directory cards and about section`
  - _Requirements: AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5_
  - _Design: UI Composition - Home_

- [x] 1.3 Create dynamic city route with generateStaticParams
  - **Do**:
    1. Create `app/[state]/[city]/page.tsx`
    2. Import data layer functions
    3. Implement `generateStaticParams()` using `getStaticCityParams()`
    4. Render city page with title "{City}, {State}", summary paragraph
    5. Render meeting cards section (single-column)
    6. Each meeting card: formatted title, summary, "Full transcript" link to `#`
    7. Return 404 via `notFound()` for unknown params
  - **Files**: `app/[state]/[city]/page.tsx`
  - **Done when**: `/ca/monterey-park` and `/co/fort-collins` render with meetings; unknown routes 404
  - **Verify**: `npm run build && curl -s http://localhost:3000/ca/monterey-park | grep -q "Monterey Park"`
  - **Commit**: `feat(city): add dynamic city pages with meeting cards`
  - _Requirements: AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-3.2, AC-3.4_
  - _Design: Routing Design, Static Generation Strategy_

- [x] 1.4 [VERIFY] Quality checkpoint: npm run lint && npx tsc --noEmit
  - **Do**: Run lint and type check, fix any errors
  - **Verify**: `npm run lint && npx tsc --noEmit`
  - **Done when**: Both commands exit 0
  - **Commit**: `chore(quality): pass lint and type check` (if fixes needed)

- [x] 1.5 Add semantic HTML structure
  - **Do**:
    1. Ensure home page uses `<main>`, `<section>` elements
    2. Ensure city page uses `<main>`, `<section>`, proper `<h1>` heading
    3. Add descriptive text labels to all links
    4. Verify heading hierarchy (h1 > h2 > h3)
  - **Files**: `app/page.tsx`, `app/[state]/[city]/page.tsx`
  - **Done when**: Pages use semantic HTML with logical heading order
  - **Verify**: `npm run build`
  - **Commit**: `feat(a11y): add semantic HTML structure to pages`
  - _Requirements: AC-4.1, AC-4.2_
  - _Design: UI Composition_

- [x] 1.6 Create quality gate scripts for POC validation
  - **Do**:
    1. Create `scripts/validate/home-layout-content-e2e.mjs` - validates city cards count, content, responsive behavior
    2. Create `scripts/validate/city-page-content-e2e.mjs` - validates city routes, content, meeting cards
    3. Create `scripts/validate/routes-not-found-check.mjs` - validates unknown routes return 404
    4. Create `scripts/validate/lint-check.mjs` - runs npm run lint
    5. Create `scripts/validate/build-check.mjs` - runs npm run build
    6. Update `scripts/validate/gates.json` to register all 5 gates
  - **Files**:
    - `scripts/validate/home-layout-content-e2e.mjs`
    - `scripts/validate/city-page-content-e2e.mjs`
    - `scripts/validate/routes-not-found-check.mjs`
    - `scripts/validate/lint-check.mjs`
    - `scripts/validate/build-check.mjs`
    - `scripts/validate/gates.json`
  - **Done when**: All gate scripts exist and are registered in gates.json
  - **Verify**: `node scripts/validate/run-gates.mjs --id lint-check && node scripts/validate/run-gates.mjs --id build-check`
  - **Commit**: `feat(gates): add quality gate scripts for site structure validation`
  - _Requirements: AC-5.1, AC-5.2, AC-5.3_
  - _Design: Quality Gate Plan_

- [x] 1.7 POC Checkpoint - verify all features work end-to-end
  - **Do**:
    1. Run build to generate static pages
    2. Start production server
    3. Verify home page shows 2 city cards via curl
    4. Verify city pages render via curl
    5. Verify 404 for unknown routes
    6. Run all quality gates
  - **Verify**: `npm run build && node scripts/validate/run-gates.mjs --all`
  - **Done when**: All gates pass, pages render correctly
  - **Commit**: `feat(poc): complete POC for city site structure`

## Phase 2: Refactoring

After POC validated, clean up code structure.

- [x] 2.1 Extract reusable CityCard component
  - **Do**:
    1. Create `app/components/CityCard.tsx`
    2. Extract city card rendering logic from home page
    3. Props: city object with name, state, slug, stateCode, summary
    4. Import and use in home page
  - **Files**: `app/components/CityCard.tsx`, `app/page.tsx`
  - **Done when**: CityCard is reusable component, home page uses it
  - **Verify**: `npm run build && npx tsc --noEmit`
  - **Commit**: `refactor(components): extract CityCard component`
  - _Design: UI Composition_

- [x] 2.2 Extract reusable MeetingCard component
  - **Do**:
    1. Create `app/components/MeetingCard.tsx`
    2. Extract meeting card rendering logic from city page
    3. Props: meeting object with title, summary, transcriptUrl
    4. Import and use in city page
  - **Files**: `app/components/MeetingCard.tsx`, `app/[state]/[city]/page.tsx`
  - **Done when**: MeetingCard is reusable component, city page uses it
  - **Verify**: `npm run build && npx tsc --noEmit`
  - **Commit**: `refactor(components): extract MeetingCard component`
  - _Design: UI Composition_

- [x] 2.3 [VERIFY] Quality checkpoint: npm run lint && npx tsc --noEmit && npm run build
  - **Do**: Run all quality commands, fix any issues
  - **Verify**: `npm run lint && npx tsc --noEmit && npm run build`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(quality): pass quality checkpoint` (if fixes needed)

- [x] 2.4 Add error handling to data layer
  - **Do**:
    1. Add input validation to getCityByParams (check for valid state/city format)
    2. Ensure getMeetingsForCity returns empty array for invalid inputs
    3. Add JSDoc comments to all exported functions
  - **Files**: `app/lib/cityData.ts`
  - **Done when**: Functions handle edge cases gracefully
  - **Verify**: `npx tsc --noEmit`
  - **Commit**: `refactor(data): add error handling and documentation`
  - _Requirements: AC-3.5_
  - _Design: Data-Layer API_

## Phase 3: Testing

- [x] 3.1 Create E2E test for home page content and layout
  - **Do**:
    1. Create `skills/webapp-testing/home_page_test.py`
    2. Test: page loads at `/`
    3. Test: exactly 2 city cards present
    4. Test: cards contain "Monterey Park" and "Fort Collins"
    5. Test: About section present with title
    6. Test: links navigate to correct city routes
  - **Files**: `skills/webapp-testing/home_page_test.py`
  - **Done when**: E2E tests validate home page acceptance criteria
  - **Verify**: `python3 skills/webapp-testing/scripts/with_server.py --server "npm run dev" --port 3000 -- python3 skills/webapp-testing/home_page_test.py`
  - **Commit**: `test(e2e): add home page content and layout tests`
  - _Requirements: AC-1.1, AC-1.2, AC-1.3, AC-1.5_
  - _Design: Quality Gate Plan_

- [x] 3.2 Create E2E test for city page content
  - **Do**:
    1. Create `skills/webapp-testing/city_page_test.py`
    2. Test: `/ca/monterey-park` loads with correct title
    3. Test: `/co/fort-collins` loads with correct title
    4. Test: meeting cards present on each page
    5. Test: "Full transcript" links present
    6. Test: page summary paragraph present
  - **Files**: `skills/webapp-testing/city_page_test.py`
  - **Done when**: E2E tests validate city page acceptance criteria
  - **Verify**: `python3 skills/webapp-testing/scripts/with_server.py --server "npm run dev" --port 3000 -- python3 skills/webapp-testing/city_page_test.py`
  - **Commit**: `test(e2e): add city page content tests`
  - _Requirements: AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6_
  - _Design: Quality Gate Plan_

- [x] 3.3 Create E2E test for 404 behavior
  - **Do**:
    1. Create `skills/webapp-testing/not_found_test.py`
    2. Test: `/invalid/route` returns 404
    3. Test: `/ca/invalid-city` returns 404
    4. Test: `/xx/monterey-park` returns 404
  - **Files**: `skills/webapp-testing/not_found_test.py`
  - **Done when**: E2E tests validate 404 behavior for unknown routes
  - **Verify**: `python3 skills/webapp-testing/scripts/with_server.py --server "npm run dev" --port 3000 -- python3 skills/webapp-testing/not_found_test.py`
  - **Commit**: `test(e2e): add 404 route tests`
  - _Requirements: AC-3.4_
  - _Design: Quality Gate Plan_

- [ ] 3.4 [VERIFY] Quality checkpoint: npm run lint && npx tsc --noEmit && npm run build
  - **Do**: Run all quality commands, fix any issues
  - **Verify**: `npm run lint && npx tsc --noEmit && npm run build`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(quality): pass quality checkpoint` (if fixes needed)

- [ ] 3.5 Update gate scripts to use new E2E tests
  - **Do**:
    1. Update `scripts/validate/home-layout-content-e2e.mjs` to run home_page_test.py
    2. Update `scripts/validate/city-page-content-e2e.mjs` to run city_page_test.py
    3. Update `scripts/validate/routes-not-found-check.mjs` to run not_found_test.py
    4. Verify all gates still pass
  - **Files**:
    - `scripts/validate/home-layout-content-e2e.mjs`
    - `scripts/validate/city-page-content-e2e.mjs`
    - `scripts/validate/routes-not-found-check.mjs`
  - **Done when**: Gate scripts delegate to E2E Python tests
  - **Verify**: `node scripts/validate/run-gates.mjs --all`
  - **Commit**: `test(gates): update gate scripts to use E2E tests`
  - _Requirements: AC-5.1, AC-5.2, AC-5.4_
  - _Design: Quality Gate Plan_

## Phase 4: Quality Gates

- [ ] 4.1 [VERIFY] Full local CI: npm run lint && npx tsc --noEmit && npm run build && node scripts/validate/run-gates.mjs --all
  - **Do**: Run complete local CI suite
  - **Verify**: `npm run lint && npx tsc --noEmit && npm run build && node scripts/validate/run-gates.mjs --all`
  - **Done when**: All commands pass, all gates green
  - **Commit**: `chore(quality): pass local CI` (if fixes needed)

- [ ] 4.2 Create PR and verify CI
  - **Do**:
    1. Verify current branch is feature branch: `git branch --show-current`
    2. Push branch: `git push -u origin <branch-name>`
    3. Create PR: `gh pr create --title "feat(site): add city directory site structure" --body "..."`
    4. Wait for CI: `gh pr checks --watch`
  - **Verify**: `gh pr checks` shows all green
  - **Done when**: PR created, CI passes
  - **Commit**: None (PR creation)

## Phase 5: PR Lifecycle

- [ ] 5.1 Monitor CI and fix any failures
  - **Do**:
    1. Check CI status: `gh pr checks`
    2. If failures: read logs, fix locally, push
    3. Re-verify: `gh pr checks --watch`
  - **Verify**: `gh pr checks` all passing
  - **Done when**: CI green on all checks
  - **Commit**: `fix(ci): address CI failures` (if fixes needed)

- [ ] 5.2 [VERIFY] AC checklist verification
  - **Do**:
    1. Read requirements.md
    2. Verify each AC via grep/code inspection:
       - AC-1.1: grep for city cards in home page
       - AC-1.2: grep for "Monterey Park" and "Fort Collins"
       - AC-2.1: verify routes exist in app directory
       - AC-3.1: verify data layer exports functions
       - AC-5.3: verify gates.json has all gates
    3. Run gates to confirm: `node scripts/validate/run-gates.mjs --all`
  - **Verify**: `node scripts/validate/run-gates.mjs --all`
  - **Done when**: All acceptance criteria confirmed via automated checks
  - **Commit**: None

- [ ] 5.3 Final PR review readiness
  - **Do**:
    1. Verify zero test regressions
    2. Verify code is modular (components extracted)
    3. Verify CI green
    4. Update PR description if needed
  - **Verify**: `gh pr checks && gh pr view --json state`
  - **Done when**: PR ready for review
  - **Commit**: None

## Notes

**POC shortcuts taken:**
- Lorem ipsum text for city/meeting summaries
- Hardcoded seed data (2 cities, meetings)
- Transcript links point to `#`
- Minimal styling (Flexbox layout only)

**Production TODOs:**
- Replace dummy data with DB-backed functions
- Add real transcript URLs
- Implement transcript detail page
- Add search/filtering UX
- Real content for summaries
