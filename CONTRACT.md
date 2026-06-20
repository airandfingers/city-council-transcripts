# Publisher Contract

`contract/schema.v1.json` is the **machine-readable schema contract** for
external publishers writing data directly into the `city-council-transcripts`
Neon database.

## Who reads this

Any process that writes rows into Neon — primarily `city-council-transcriber`
but open to future contributors — **must** fetch the current contract, project
its data onto it, and validate before writing. The web app (Prisma + Neon) is
the authoritative owner; this contract is derived from the Prisma schema.

## One contract at a time

There is no version pinning for publishers. Publishers always target the
**current** published contract. The contract is fetched fresh on every publish
run so that the publisher automatically picks up new fields when the web app
migrates (see auto-catch-up below).

## How publishers use the contract

1. **Fetch** `contract/schema.v1.json` (via filesystem or `GET /api/contract`).
2. **Project** the export data DOWN onto the contract's column set — drop any
   fields the current schema doesn't have yet. This is how a richer/newer
   transcriber payload succeeds against an older web-app schema.
3. **Validate** required fields and types; fail closed before attempting any
   DB write.
4. **Check** `contract_major` against the publisher's understood major; refuse
   if the contract's major is higher than the publisher supports (a breaking
   change occurred — publisher needs updating).
5. **Write** directly to Neon, in `write_order` (FK dependency order).

## Backwards compatibility direction

The transcriber's data evolves **faster** than the web app's schema.
The web app is the trailing, authoritative bound.

- When the transcriber has **more data than the current schema supports**:
  the publisher projects down (step 2 above) and the write succeeds.
  The extra fields are simply not written yet.
- When the web app **adds a new nullable column** and republishes the contract:
  the publisher automatically starts populating it on the next run (because it
  re-fetched). Existing data in the DB for that column is null until re-published.

We do **not** protect against a publisher that is behind the schema (omitting
a column the web app requires). In this model the transcriber always leads;
that case should not arise in practice.

## Versioning rules

### Minor bump (`1.0` → `1.1`) — additive, backwards-compatible
- New nullable or defaulted columns added to any table.
- No existing column removed, renamed, or made newly required.

Publishers transparently pick up new fields after fetching the updated contract.
No publisher code changes required.

### Major bump (`1.x` → `2.0`) — breaking change
- An existing required column is removed or renamed.
- A column's type changes incompatibly.
- A table is removed or renamed.
- A previously-optional column becomes required without a default.

Publishers must update their write layer to handle the new major before they
can publish again.

**Expand/contract pattern for breaking changes:**

1. Add the new shape alongside the old (both nullable).
2. Update publishers to write the new shape.
3. Once all publishers are updated, retire the old columns in a follow-up migration.

### Automated check

```bash
npm run db:contract -- --check   # exits 1 if contract/schema.v1.json is stale
```

Add this to CI after Prisma migrations.

## Regenerating the contract

Run after any Prisma schema change:

```bash
npm run db:contract
```

This reads the live Prisma DMMF and rewrites `contract/schema.v1.json`.
Commit the updated file alongside the migration.

**Bump the version before regenerating when a breaking change is involved:**
Open `scripts/generate-contract.mjs`, increment `CONTRACT_MAJOR` and reset
`CONTRACT_MINOR = 0`.

## HTTP endpoint

`GET /api/contract` serves the current `contract/schema.v1.json` over HTTP,
so remote publishers can fetch it without cloning the repo.

- No authentication required (the contract is public schema metadata).
- Response is `application/json` with a long `Cache-Control` header.
- The URL path is stable; the contract body carries `contract_version` and
  `contract_major` so publishers can gate on the version without URL changes.

## Column conventions

| Field annotation      | `required` in contract | Meaning for publisher                         |
|-----------------------|------------------------|-----------------------------------------------|
| `NOT NULL`, no default | `true`                | Must be provided.                             |
| `NOT NULL`, has default | `false`              | Can be omitted; DB fills the default.         |
| Nullable (`?`)        | `false`                | Can be omitted or sent as `null`.             |
| `fk: true`            | `true` (in DB)         | Resolved by the write layer, not by publisher.|

Auto-generated columns (`id`, `createdAt`, `updatedAt`) are excluded from the
contract entirely — the publisher never writes them.
