---
spec: db-schema
phase: research
created: 2026-02-25
---

# Research: db-schema

## Executive Summary

The project currently hardcodes cities and meetings as in-memory arrays in `app/lib/cityData.ts`. Adding Prisma 7 with the `@prisma/adapter-neon` driver adapter is the recommended approach for connecting to Neon PostgreSQL. The schema needs three core tables: `City`, `Meeting`, and `TranscriptLine`. An export JSON file already exists with real transcript segment data (speaker, text, timestamps, confidence) that maps cleanly to the proposed schema.

## External Research

### Prisma 7 + Neon: Current Best Practices

| Aspect | Detail | Source |
|--------|--------|--------|
| Prisma version | 7.2.0 (latest) | [npm](https://www.npmjs.com/package/prisma) |
| Generator provider | `"prisma-client"` (not `"prisma-client-js"`) | [Prisma 7 migration](https://www.prisma.io/docs/ai/prompts/prisma-7) |
| Adapter package | `@prisma/adapter-neon` | [Neon docs](https://neon.com/docs/guides/prisma) |
| Config file | `prisma.config.ts` required for CLI (migrations, push) | [Neon docs](https://neon.com/docs/guides/prisma) |
| ESM requirement | Prisma 7 requires `"type": "module"` in package.json | [Prisma ESM guide](https://www.prisma.io/docs/ai/prompts/prisma-7) |
| Datasource block | Prisma 7: do NOT put `url` in datasource; use `prisma.config.ts` for CLI | [Neon docs](https://neon.com/docs/guides/prisma) |
| Connection pooling | Use `-pooler` hostname for `DATABASE_URL`, direct for `DIRECT_URL` | [Neon docs](https://neon.com/docs/guides/prisma) |
| Singleton pattern | Attach PrismaClient to `globalThis` in dev to survive hot reload | [Prisma Next.js guide](https://www.prisma.io/docs/guides/nextjs) |

### Required Packages

```
prisma @prisma/client @prisma/adapter-neon @neondatabase/serverless dotenv
```

### Schema Configuration (Prisma 7 style)

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../app/generated/prisma"
  moduleFormat = "esm"
}

datasource db {
  provider = "postgresql"
}
```

### prisma.config.ts (required for CLI)

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
})
```

### Singleton Client (app/lib/prisma.ts)

```typescript
import { PrismaClient } from '../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### Pitfalls to Avoid

- **Cold starts**: Neon computes scale to zero; first query may timeout. Use `connect_timeout=10` in connection string.
- **Connection limits**: Use `connection_limit=1` for serverless; Neon pooler handles multiplexing.
- **ESM transition**: Adding `"type": "module"` to package.json may break existing `.mjs` scripts or require adjustments. Existing scripts at `scripts/validate/run-gates.mjs` already use `.mjs` extension so should be fine.
- **Custom output path**: Known Prisma 7 issue where generated client may not be ESM-compliant in custom output dirs. Use `moduleFormat = "esm"` in generator block as workaround.
- **Never run `prisma migrate dev` in production**; use `prisma migrate deploy`.

## Codebase Analysis

### Current Data Model

**File**: `app/lib/cityData.ts`

Two types defined:

```typescript
type City = {
  stateCode: string;    // "ca"
  stateName: string;    // "California"
  cityName: string;     // "Monterey Park"
  citySlug: string;     // "monterey-park"
  summary: string;
}

type Meeting = {
  id: string;           // "mp-2026-02-13"
  citySlug: string;
  stateCode: string;
  title: string;
  summary: string;
  transcriptUrl: string;
}
```

**Seed data**: 2 cities (Monterey Park CA, Fort Collins CO), 3 meetings (2 for MP, 1 for FC).

**Data access functions** (4 total):
- `getSeedCities()` - all cities
- `getCityByParams(stateCode, citySlug)` - single city lookup
- `getMeetingsForCity(stateCode, citySlug)` - meetings for a city
- `getStaticCityParams()` - for `generateStaticParams`

### Transcript Export Data

**File**: `export-transcription-data_20260217_131008.json` (27K lines)

Contains 11 meeting records from city-council-transcriber pipeline. Key segment structure:

```json
{
  "id": 0,
  "start": 0.0,
  "end": 6.62,
  "text": "All right. Good evening, everyone...",
  "speaker": "SPEAKER_00",
  "speaker_name": "Elizabeth Yang",
  "speaker_confidence": 0.0,
  "global_speaker_uuid": "b9bda7c0-..."
}
```

Relevant fields per segment: `id`, `start`, `end`, `text`, `speaker`, `speaker_name`, `speaker_confidence`, `global_speaker_uuid`.

Speaker data includes:
- `name`: null or identified name
- `confidence`: 0.0 (unidentified) to 1.0 (known)
- `review_status`: "pending_auto" | "needs_human"
- `global_uuid`: cross-meeting speaker identity

### Consumers

| File | Uses |
|------|------|
| `app/page.tsx` | `getSeedCities()` |
| `app/[state]/[city]/page.tsx` | `getCityByParams()`, `getMeetingsForCity()`, `getStaticCityParams()` |
| `app/components/CityCard.tsx` | `City` type |
| `app/components/MeetingCard.tsx` | `Meeting` type |

### Dependencies & Constraints

- **No existing ORM or DB**: Clean slate
- **No `.env` file**: Need to create with Neon credentials
- **package.json lacks `"type": "module"`**: Must add for Prisma 7
- **tsconfig.json**: Already has `module: "esnext"` and `moduleResolution: "bundler"` -- compatible
- **ESLint 9 flat config**: Should be unaffected
- **Existing gate scripts**: `.mjs` extension, should work with ESM package type

## Related Specs

| Spec | Relevance | mayNeedUpdate |
|------|-----------|---------------|
| `site-structure` | **High** - Created the data layer (`cityData.ts`) and types that this spec replaces with DB. Components consume `City` and `Meeting` types. | true - types will change to Prisma-generated types, data functions will become async DB queries |
| `hello-world` | **Low** - Trivial, already superseded by site-structure | false |

## Proposed Schema Design

```prisma
model City {
  id        Int       @id @default(autoincrement())
  stateCode String    @db.VarChar(2)
  stateName String    @db.VarChar(100)
  name      String    @db.VarChar(200)
  slug      String    @db.VarChar(200)
  summary   String    @db.Text
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  meetings  Meeting[]

  @@unique([stateCode, slug])
  @@index([stateCode])
}

model Meeting {
  id        Int              @id @default(autoincrement())
  cityId    Int
  title     String           @db.VarChar(500)
  date      DateTime
  summary   String           @db.Text
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  city      City             @relation(fields: [cityId], references: [id])
  lines     TranscriptLine[]

  @@index([cityId])
  @@index([date])
}

model TranscriptLine {
  id                Int     @id @default(autoincrement())
  meetingId         Int
  lineIndex         Int
  startTime         Float
  endTime           Float
  speaker           String  @db.VarChar(200)
  speakerName       String? @db.VarChar(200)
  text              String  @db.Text
  confidence        Float   @default(0.0)
  globalSpeakerUuid String? @db.VarChar(36)
  meeting           Meeting @relation(fields: [meetingId], references: [id])

  @@unique([meetingId, lineIndex])
  @@index([meetingId])
  @@index([globalSpeakerUuid])
}
```

### Design Rationale

| Decision | Reason |
|----------|--------|
| `autoincrement` IDs | Simple, sequential; no need for UUIDs at app level |
| `City` has `@@unique([stateCode, slug])` | Matches current lookup pattern in `getCityByParams` |
| `TranscriptLine.lineIndex` | Preserves ordering from source transcript segments |
| `TranscriptLine.confidence` | Maps to `speaker_confidence` from export; used for low-confidence warning UI |
| `TranscriptLine.speakerName` | Nullable; unidentified speakers have label only |
| `TranscriptLine.globalSpeakerUuid` | Cross-meeting speaker identity from diarization pipeline |
| `Float` for timestamps | Seconds with decimals (e.g., 6.62), matching source data |
| No `State` model | Only 2 states, stored as fields on `City`; YAGNI |
| No `Speaker` model | Speaker identification is inline per-line; global UUID enables future normalization |

## Feasibility Assessment

| Aspect | Assessment | Notes |
|--------|------------|-------|
| Technical Viability | **High** | Prisma 7 + Neon is well-documented, actively maintained |
| Effort Estimate | **M** | Schema + config + seed script + singleton + env setup |
| Risk Level | **Low** | No frontend changes; DB schema only. ESM migration is the main risk |

### Key Risks

1. **ESM transition**: Adding `"type": "module"` could affect existing scripts. Mitigation: `.mjs` scripts already work in ESM mode.
2. **Prisma 7 custom output ESM bug**: Known issue with generated client in custom output dirs. Mitigation: use `moduleFormat = "esm"` directive.
3. **Neon cold starts**: First query after idle may be slow. Mitigation: acceptable for non-production use; configure `connect_timeout`.

## Migration Strategy

1. **Install deps**: `prisma`, `@prisma/client`, `@prisma/adapter-neon`, `@neondatabase/serverless`, `dotenv`
2. **Add `"type": "module"`** to `package.json`
3. **Create `prisma/schema.prisma`** with models above
4. **Create `prisma.config.ts`** at project root
5. **Create `.env`** with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) from Neon console
6. **Run `npx prisma generate`** to generate client
7. **Run `npx prisma db push`** to create tables on Neon
8. **Create `app/lib/prisma.ts`** singleton client
9. **Create seed script** (`prisma/seed.ts`) to populate cities and optionally import transcript data
10. **Add `.env` to `.gitignore`**; create `.env.example` template

## Quality Commands

| Type | Command | Source |
|------|---------|--------|
| Lint | `npm run lint` | package.json scripts.lint |
| TypeCheck | `npm run typecheck` | package.json scripts.typecheck |
| Build | `npm run build` | package.json scripts.build |
| Test (all) | `npm run test` | package.json scripts.test (runs gates) |
| Test (gates) | `npm run test:gates` | package.json scripts.test:gates |
| Test (quick) | `npm run test:quick` | package.json scripts.test:quick (lint + typecheck) |

**Local CI**: `npm run lint && npm run typecheck && npm run build`

Note: No unit test framework (jest/vitest) installed. E2E tests use Python Playwright via `.venv`.

## Recommendations for Requirements

1. **Use Prisma 7** with `@prisma/adapter-neon` -- this is the current recommended stack for Neon + Next.js
2. **Schema: 3 models** -- `City`, `Meeting`, `TranscriptLine` as designed above
3. **Seed script** should populate the 2 cities and 3 placeholder meetings to match current hardcoded data
4. **Do NOT change data access layer yet** -- keep `cityData.ts` working with hardcoded data; a future spec can swap to DB queries
5. **Add `postinstall` script** for `prisma generate` to ensure client stays in sync
6. **Store connection strings** in `.env` (gitignored) with `.env.example` template
7. **Create a seed script** in `prisma/seed.ts` for reproducible data setup
8. **Index strategy**: compound unique on `City(stateCode, slug)`, index on `Meeting(cityId)`, `TranscriptLine(meetingId)`, and `TranscriptLine(globalSpeakerUuid)` for future cross-meeting speaker queries

## Open Questions

1. Should the seed script also import transcript line data from the export JSON, or just cities and meetings?
2. Does the user already have a Neon project/database created, or should the spec include Neon project setup instructions?
3. Should we add a `postinstall` hook for `prisma generate`, or handle it manually?
4. Future consideration: should `Speaker` be a separate model for cross-meeting identity, or keep it inline on `TranscriptLine`?

## Sources

- [Neon + Prisma guide](https://neon.com/docs/guides/prisma)
- [Prisma + Next.js guide](https://www.prisma.io/docs/guides/nextjs)
- [Prisma 7 migration guide](https://www.prisma.io/docs/ai/prompts/prisma-7)
- [Prisma 7 release blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Prisma ORM 7.2.0 release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0)
- [Neon + Next.js guide](https://neon.com/docs/guides/nextjs)
- [Prisma production guide](https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs)
- `/Users/aarony/city-council-transcripts/app/lib/cityData.ts` - current data layer
- `/Users/aarony/city-council-transcripts/export-transcription-data_20260217_131008.json` - transcript export data
- `/Users/aarony/city-council-transcripts/package.json` - project dependencies
- `/Users/aarony/city-council-transcripts/tsconfig.json` - TypeScript config
