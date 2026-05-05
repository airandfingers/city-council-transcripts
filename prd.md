# Product Requirements

## Implementation Status Summary

- ✅ US-LOCALDB-001 — Local Postgres for development

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
