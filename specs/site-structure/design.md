---
spec: city-site-structure
phase: design
created: 2026-02-13T00:00:00Z
---

# Design: City Site Structure

## Overview

Implement a small App Router information site with:

1. home city directory cards, 2) dynamic city pages, and 3) a gate-first validation workflow for Ralph loops.

## Design Goals

- Keep implementation simple and static-first.
- Isolate data access behind dummy server functions.
- Ensure every major acceptance area has a quality gate.

## Routing Design (App Router)

- `/` → Home page
- `/[state]/[city]` → City page (state/city derived from static params)
- Unknown state/city combinations should resolve to 404.

## Data Model (dummy seed)

```ts
type City = {
  stateCode: string; // "ca"
  stateName: string; // "California"
  cityName: string; // "Monterey Park"
  citySlug: string; // "monterey-park"
  summary: string; // 2-sentence lorem
};

type Meeting = {
  id: string;
  citySlug: string;
  stateCode: string;
  title: string; // "City Council Meeting - Friday, Feb 13, 2026"
  summary: string;
  transcriptUrl: string; // "#" for now
};
```

## Data-Layer API (server-only)

Create a small server module (example path: `app/lib/cityData.ts`) exposing:

- `getSeedCities(): City[]`
- `getCityByParams(stateCode: string, citySlug: string): City | null`
- `getMeetingsForCity(stateCode: string, citySlug: string): Meeting[]`
- `getStaticCityParams(): Array<{ state: string; city: string }>`

These functions are the boundary Ralph can later swap to DB calls.

## UI Composition

### Home (`/`)

- `main` containing:
  - section: city cards grid using Flexbox
  - section: About block
- Card content:
  - city/state heading
  - link to city page
  - 2-sentence summary

### City (`/[state]/[city]`)

- `main` containing:
  - city title (`h1`)
  - city summary paragraph
  - section for meetings list (single-column cards)
- Meeting card content:
  - formatted meeting title
  - summary paragraph
  - "Full transcript" link to `#`

## Static Generation Strategy

- In dynamic route segment file, implement `generateStaticParams()` using `getStaticCityParams()`.
- Render page as server component using data-layer functions.
- Return 404 for unknown params.

## Styling Strategy

- Use existing global styles and simple class names.
- Flexbox behavior for city cards:
  - stacked on narrow viewports
  - two columns when viewport allows
- Keep styles minimal and deterministic for robust gate assertions.

## Quality Gate Plan (for Ralph)

Register these gate ids in `scripts/validate/gates.json`:

- `home-layout-content-e2e`
  - verifies `/` city cards count/content, about section, responsive behavior
- `city-page-content-e2e`
  - verifies `/ca/monterey-park` and `/co/fort-collins` content + meeting cards + transcript links
- `routes-not-found-check`
  - verifies unknown city route returns 404
- `lint-check`
  - runs `npm run lint`
- `build-check`
  - runs `npm run build`

## Ralph Iteration Plan

1. **Gate-first iteration**: add gate scripts + manifest entries for new stories.
2. **Routing/data iteration**: implement data layer + static params + 404 behavior.
3. **Home page iteration**: implement city cards + about section + flex behavior.
4. **City page iteration**: implement city summary + meeting cards.
5. **Hardening iteration**: run all gates, fix failures, polish semantics.

## Definition of Done

- All acceptance criteria in requirements are satisfied.
- All registered gates pass with `node scripts/validate/run-gates.mjs --all`.
- Changes are reflected in `.ralph/@fix_plan.md` and committed by Ralph.
