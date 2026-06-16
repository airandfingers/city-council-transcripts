#!/usr/bin/env node

/**
 * Generate (or validate) the publisher contract from the live Prisma DMMF.
 *
 * The contract describes every writable table in the Neon DB so that external
 * publishers (e.g. city-council-transcriber) can project their data down to
 * the current schema and validate it before writing.
 *
 * Usage:
 *   node scripts/generate-contract.mjs              # write contract/schema.v1.json
 *   node scripts/generate-contract.mjs --check      # diff only — exit 1 if stale
 *   npm run db:contract                              # same as write
 *   npm run db:contract -- --check                  # same as --check
 *
 * Run this script after every Prisma migration that changes writable columns.
 * Bump CONTRACT_MAJOR (below) and set CONTRACT_MINOR = 0 when a breaking
 * change is introduced (see CONTRACT.md for the definition of "breaking").
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Version — bump CONTRACT_MAJOR on breaking changes only (see CONTRACT.md)
// ---------------------------------------------------------------------------

const CONTRACT_MAJOR = 1; // increment on breaking changes; reset MINOR to 0
const CONTRACT_MINOR = 0; // increment on additive (backwards-compatible) changes

const CONTRACT_VERSION = `${CONTRACT_MAJOR}.${CONTRACT_MINOR}`;

// ---------------------------------------------------------------------------
// Tables to expose — in FK dependency order for correct write ordering.
// Auto-generated columns (id, createdAt, updatedAt) are excluded.
// ---------------------------------------------------------------------------

/** @type {string[]} */
const WRITE_ORDER = [
  "City",
  "Meeting",
  "TranscriptLine",
  "MeetingSummaryItem",
  "MeetingDocument",
  "MeetingSegment",
  "MinutesItem",
  "TopicSummary",
  "SpeakerSummary",
];

/**
 * Columns to exclude from the contract entirely.
 * These are either auto-generated or relation (virtual) fields.
 *
 * @type {Set<string>}
 */
const EXCLUDE_ALWAYS = new Set(["id", "createdAt", "updatedAt"]);

/**
 * FK columns that are resolved by the write layer (not supplied directly by
 * the publisher in export data). They still appear in the contract so Python
 * knows they exist in the DB and are required — but "fk": true signals that
 * the write layer populates them.
 *
 * @type {Set<string>}
 */
const FK_COLUMNS = new Set(["cityId", "meetingId"]);

/**
 * Upsert / unique keys per table (used by Python's write layer for idempotency).
 * Keys listed here are column names in camelCase (Prisma convention).
 *
 * @type {Record<string, string[][]>}
 */
const UPSERT_KEYS = {
  City:               [["stateCode", "slug"]],
  Meeting:            [["slug"]],
  TranscriptLine:     [["meetingId", "lineIndex"]],
  MeetingSummaryItem: [["meetingId", "type", "sortOrder"]],
  MeetingDocument:    [["meetingId", "url"]],
  MeetingSegment:     [["meetingId", "itemId"]],
  MinutesItem:        [["meetingId", "itemId"]],
  TopicSummary:       [["meetingId", "topicId"]],
  SpeakerSummary:     [["meetingId", "speakerUuid"]],
};

/**
 * Short human-readable descriptions per table.
 *
 * @type {Record<string, string>}
 */
const TABLE_DESCRIPTIONS = {
  City:               "A municipality. Must exist before meetings can be written.",
  Meeting:            "A single council meeting session, child of City.",
  TranscriptLine:     "One timestamped speaker turn in the meeting transcript.",
  MeetingSummaryItem: "A typed summary bullet (KEY_DECISION, ACTION_ITEM, etc.).",
  MeetingDocument:    "An agenda packet doc, staff report, or attachment.",
  MeetingSegment:     "An agenda-item section with AI-generated discussion summary.",
  MinutesItem:        "An official minutes item aligned to a transcript timestamp.",
  TopicSummary:       "An AI-generated topic-level summary with speakers and positions.",
  SpeakerSummary:     "An AI-generated per-speaker rollup of the meeting.",
};

// ---------------------------------------------------------------------------
// Prisma type → contract type
// ---------------------------------------------------------------------------

/** @param {string} prismaType @returns {string} */
function contractType(prismaType) {
  switch (prismaType) {
    case "String":   return "string";
    case "Int":      return "integer";
    case "Float":    return "float";
    case "Boolean":  return "boolean";
    case "DateTime": return "datetime";
    case "Json":     return "json";
    default:         return prismaType.toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Build contract from Prisma DMMF
// ---------------------------------------------------------------------------

function buildContract() {
  const models = Prisma.dmmf.datamodel.models;
  const modelMap = Object.fromEntries(models.map((m) => [m.name, m]));

  const tables = {};

  for (const tableName of WRITE_ORDER) {
    const model = modelMap[tableName];
    if (!model) {
      throw new Error(`Model "${tableName}" not found in Prisma DMMF. Is the schema up to date?`);
    }

    const columns = {};

    for (const field of model.fields) {
      // Skip relation (virtual) fields and always-excluded auto-generated columns
      if (field.kind === "object" || EXCLUDE_ALWAYS.has(field.name)) {
        continue;
      }

      const isFk = FK_COLUMNS.has(field.name);

      /** @type {Record<string, unknown>} */
      const col = {
        type: contractType(field.type),
        // A column is "required" from the publisher's perspective when it is
        // non-nullable and has no DB default. FK columns are technically required
        // by the DB but are resolved by the write layer — they are still
        // flagged required:true so Python knows the DB constraint.
        // Note: Prisma DMMF uses `hasDefaultValue`, not `hasDefault`.
        required: field.isRequired && !field.hasDefaultValue,
      };

      if (isFk) {
        col.fk = true;
        col.note = "Resolved by the write layer from the parent entity — not supplied directly in export data.";
      }

      if (field.hasDefaultValue && field.default !== null && field.default !== undefined) {
        const def = field.default;
        // Prisma represents scalar defaults as { name: "...", args: value } or
        // as a plain scalar. Normalise to a readable default.
        if (typeof def === "object" && def !== null && "name" in def) {
          // e.g. { name: "now", args: [] } or { name: "autoincrement", args: [] }
          col.default = def.name === "now" ? "now()" : JSON.stringify(def);
        } else {
          col.default = def;
        }
      }

      // Add max_length hint for VARCHAR fields (informational for Python validators)
      const dbAttr = field.nativeType; // e.g. { name: "VarChar", args: [200] }
      if (dbAttr && dbAttr.name === "VarChar" && Array.isArray(dbAttr.args) && dbAttr.args.length > 0) {
        col.max_length = dbAttr.args[0];
      }

      columns[field.name] = col;
    }

    tables[tableName] = {
      description: TABLE_DESCRIPTIONS[tableName] ?? "",
      upsert_keys: UPSERT_KEYS[tableName] ?? [],
      columns,
    };
  }

  return {
    contract_version: CONTRACT_VERSION,
    contract_major: CONTRACT_MAJOR,
    generated_at: new Date().toISOString(),
    description:
      "Publisher contract for city-council-transcripts. " +
      "External publishers (e.g. city-council-transcriber) must fetch the current " +
      "contract, project their data onto it (dropping surplus fields), validate, " +
      "and then write directly to Neon. See CONTRACT.md for versioning rules.",
    versioning_summary:
      "Publishers always target the CURRENT contract (no version pinning). " +
      "New columns are additive/nullable so older publisher data still writes. " +
      "Publishers project richer data DOWN to what the current schema supports. " +
      "A contract_major bump signals a breaking change requiring publisher updates.",
    write_order: WRITE_ORDER,
    tables,
  };
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

/** Deep-equal comparison (ignores generated_at). */
function contractsEqual(a, b) {
  const normalize = (c) => {
    const copy = JSON.parse(JSON.stringify(c));
    delete copy.generated_at;
    return JSON.stringify(copy, null, 2);
  };
  return normalize(a) === normalize(b);
}

/** Summarise structural differences (tables/columns added/removed/changed). */
function summarizeDiff(existing, fresh) {
  const lines = [];

  if (existing.contract_version !== fresh.contract_version) {
    lines.push(`  contract_version: ${existing.contract_version} → ${fresh.contract_version}`);
  }

  const existingTables = Object.keys(existing.tables ?? {});
  const freshTables = Object.keys(fresh.tables ?? {});

  for (const t of freshTables) {
    if (!existingTables.includes(t)) {
      lines.push(`  + table added: ${t}`);
      continue;
    }
    const ec = existing.tables[t].columns;
    const fc = fresh.tables[t].columns;
    for (const col of Object.keys(fc)) {
      if (!ec[col]) {
        lines.push(`  + ${t}.${col} added`);
      } else if (JSON.stringify(ec[col]) !== JSON.stringify(fc[col])) {
        lines.push(`  ~ ${t}.${col} changed`);
      }
    }
    for (const col of Object.keys(ec)) {
      if (!fc[col]) lines.push(`  - ${t}.${col} removed`);
    }
  }
  for (const t of existingTables) {
    if (!freshTables.includes(t)) lines.push(`  - table removed: ${t}`);
  }

  return lines.length > 0 ? lines.join("\n") : "  (no structural changes)";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const checkOnly = process.argv.includes("--check");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const contractDir = resolve(__dirname, "../contract");
  const contractPath = resolve(contractDir, "schema.v1.json");

  const fresh = buildContract();

  if (checkOnly) {
    if (!existsSync(contractPath)) {
      console.error("✖  contract/schema.v1.json does not exist. Run `npm run db:contract` to generate it.");
      process.exit(1);
    }
    const raw = await readFile(contractPath, "utf-8");
    const existing = JSON.parse(raw);

    if (contractsEqual(existing, fresh)) {
      console.log("✔  contract/schema.v1.json is up to date.");
    } else {
      console.error("✖  contract/schema.v1.json is STALE. Differences:\n");
      console.error(summarizeDiff(existing, fresh));
      console.error("\nRun `npm run db:contract` to regenerate.");
      process.exit(1);
    }
    return;
  }

  // Write mode
  let existingDiff = "";
  if (existsSync(contractPath)) {
    const raw = await readFile(contractPath, "utf-8");
    const existing = JSON.parse(raw);
    if (contractsEqual(existing, fresh)) {
      console.log("✔  contract/schema.v1.json is already up to date — no changes written.");
      return;
    }
    existingDiff = summarizeDiff(existing, fresh);
  }

  if (!existsSync(contractDir)) {
    await mkdir(contractDir, { recursive: true });
  }

  await writeFile(contractPath, JSON.stringify(fresh, null, 2) + "\n", "utf-8");

  console.log("✔  contract/schema.v1.json written.");
  if (existingDiff) {
    console.log("Changes from previous contract:\n" + existingDiff);
  }
  console.log(`\nContract version: ${fresh.contract_version}`);
  console.log(`Tables: ${fresh.write_order.join(", ")}`);
}

main().catch((err) => {
  console.error("✖  Unexpected error:", err);
  process.exit(1);
});
