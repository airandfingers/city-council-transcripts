#!/usr/bin/env node

/**
 * Import meetings and transcript lines from a transcription export JSON file.
 *
 * Usage:
 *   node scripts/import-transcription-export.mjs <path-to-export.json>
 *   npm run db:import -- <path-to-export.json>
 *
 * The script will:
 *   1. Prompt the user to select a City from existing DB rows.
 *   2. For each meeting in the export file:
 *      - Skip meetings with empty segments or transcript_count <= 0.
 *      - Skip meetings whose meeting_key already exists as a Meeting slug.
 *      - Parse the date from the meeting_key prefix, prompt for confirmation.
 *      - Create the Meeting row and bulk-insert TranscriptLine rows.
 *   3. Print a summary of what was imported/skipped.
 */

import "dotenv/config";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { select, input, confirm } from "@inquirer/prompts";
import { parseMeetingKey } from "./lib/parse-meeting-key.mjs";
import { mapSegments } from "./lib/map-transcript-segments.mjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG = "[import]";
const BATCH_SIZE = 5000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args) {
  console.log(TAG, ...args);
}

function warn(...args) {
  console.warn(TAG, "⚠ ", ...args);
}

function fatal(message) {
  console.error(`${TAG} ✖  ${message}`);
  process.exit(1);
}

/**
 * Insert TranscriptLine rows in batches to avoid memory pressure on large
 * transcripts.
 *
 * @param {PrismaClient} prisma
 * @param {number} meetingId
 * @param {Array<Record<string, unknown>>} lines  Output from mapSegments()
 * @returns {Promise<number>}  Total rows inserted
 */
async function insertLinesInBatches(prisma, meetingId, lines) {
  let inserted = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).map((line) => ({
      ...line,
      meetingId,
    }));

    const result = await prisma.transcriptLine.createMany({ data: batch });
    inserted += result.count;

    if (lines.length > BATCH_SIZE) {
      log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(lines.length / BATCH_SIZE)}: ${result.count} lines`,
      );
    }
  }

  return inserted;
}

/**
 * Build MeetingSummaryItem rows from the export summary object.
 *
 * Flattens the four summary list fields into typed rows with sortOrder.
 * Returns an empty array if the summary is null/undefined.
 *
 * @param {Record<string, unknown> | null | undefined} summary
 * @returns {Array<{ type: string; text: string; sortOrder: number }>}
 */
function buildSummaryItems(summary) {
  if (!summary) return [];

  const items = [];

  const arrayFields = [
    { key: "key_decisions", type: "KEY_DECISION" },
    { key: "action_items", type: "ACTION_ITEM" },
    { key: "motions_and_votes", type: "MOTION_AND_VOTE" },
  ];

  for (const { key, type } of arrayFields) {
    const arr = summary[key];
    if (Array.isArray(arr)) {
      for (let i = 0; i < arr.length; i++) {
        const text = typeof arr[i] === "string" ? arr[i].trim() : "";
        if (text) {
          items.push({ type, text, sortOrder: i });
        }
      }
    }
  }

  const publicComments =
    typeof summary.public_comments_summary === "string"
      ? summary.public_comments_summary.trim()
      : "";
  if (publicComments) {
    items.push({ type: "PUBLIC_COMMENT_SUMMARY", text: publicComments, sortOrder: 0 });
  }

  return items;
}

/**
 * Build MeetingDocument rows from the export documents object.
 *
 * @param {Record<string, unknown> | null | undefined} documents
 * @returns {Array<{ title: string; url: string; documentType: string | null; associatedAgendaItem: string | null }>}
 */
function buildDocumentRows(documents) {
  const docs = documents?.documents;
  if (!Array.isArray(docs)) return [];

  return docs
    .filter((d) => d.url && d.title)
    .map((d) => ({
      title: d.title,
      url: d.url,
      documentType: d.document_type ?? null,
      associatedAgendaItem: d.associated_agenda_item ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // -- Validate CLI args -----------------------------------------------------

  const filePath = process.argv[2];

  if (!filePath) {
    fatal("Usage: node scripts/import-transcription-export.mjs <path-to-export.json>");
  }

  const absPath = resolve(filePath);

  try {
    await access(absPath);
  } catch {
    fatal(`File not found: ${absPath}`);
  }

  // -- Load JSON -------------------------------------------------------------

  log(`Reading ${absPath} …`);
  const raw = await readFile(absPath, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.meetings) || data.meetings.length === 0) {
    fatal("No meetings found in export file.");
  }

  log(`Found ${data.meetings.length} meeting(s) in export (version ${data.export_version ?? "?"})`);

  // -- Connect to DB ---------------------------------------------------------

  const prisma = new PrismaClient();

  try {
    // -- Select City -----------------------------------------------------------

    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });

    if (cities.length === 0) {
      fatal("No cities in the database. Seed cities first (npm run db:seed).");
    }

    const cityId = await select({
      message: "Which city do these meetings belong to?",
      choices: cities.map((c) => ({
        name: `${c.name}, ${c.stateName} (id=${c.id})`,
        value: c.id,
      })),
    });

    const city = cities.find((c) => c.id === cityId);
    log(`Selected city: ${city.name}, ${city.stateName}`);

    // -- Fetch existing slugs for fast duplicate check -------------------------

    const existingSlugs = new Set(
      (await prisma.meeting.findMany({
        where: { cityId },
        select: { slug: true },
      })).map((m) => m.slug),
    );

    // -- Process each meeting --------------------------------------------------

    let meetingsImported = 0;
    let meetingsSkipped = 0;
    let totalLinesInserted = 0;

    for (let i = 0; i < data.meetings.length; i++) {
      const mtg = data.meetings[i];
      const num = `[${i + 1}/${data.meetings.length}]`;
      const slug = mtg.meeting_key;

      log("");
      log(`${num} ${slug}`);

      // Skip: empty segments or bad transcript_count
      const segments = mtg.transcript_segments ?? [];
      const transcriptCount = mtg.transcript_count ?? 0;

      if (segments.length === 0 || transcriptCount <= 0) {
        warn(
          `Skipping — ${segments.length === 0 ? "no transcript segments" : `transcript_count=${transcriptCount}`}`,
        );
        meetingsSkipped++;
        continue;
      }

      // Skip: duplicate slug
      if (existingSlugs.has(slug)) {
        warn(`Skipping — slug already exists in DB`);
        meetingsSkipped++;
        continue;
      }

      // Parse date from meeting_key
      const { date: parsedDate } = parseMeetingKey(slug);
      const dateDefault = parsedDate ?? "";

      const dateStr = await input({
        message: `  Meeting date (YYYY-MM-DD):`,
        default: dateDefault,
        validate: (val) =>
          /^\d{4}-\d{2}-\d{2}$/.test(val) || "Must be YYYY-MM-DD format",
      });

      const meetingDate = new Date(`${dateStr}T00:00:00.000Z`);

      // Confirm import
      const shouldImport = await confirm({
        message: `  Import "${mtg.title}" (${dateStr}, ${segments.length} segments)?`,
        default: true,
      });

      if (!shouldImport) {
        warn(`Skipping — user declined`);
        meetingsSkipped++;
        continue;
      }

      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          cityId,
          slug,
          title: mtg.title,
          date: meetingDate,
          summary: mtg.summary?.overview ?? null,
          summaryModel: mtg.summary?.model ?? null,
          youtubeUrl: mtg.youtube_url ?? null,
          granicusUrl: mtg.granicus_url ?? null,
          minutesText: mtg.minutes?.text ?? null,
          minutesUrl: mtg.minutes?.portal_url ?? null,
        },
      });

      log(`  ✔ Created meeting id=${meeting.id}`);
      existingSlugs.add(slug);

      // Insert summary items (key decisions, action items, motions, public comments)
      const summaryItems = buildSummaryItems(mtg.summary);
      if (summaryItems.length > 0) {
        const result = await prisma.meetingSummaryItem.createMany({
          data: summaryItems.map((item) => ({ ...item, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} summary item(s)`);
      }

      // Insert meeting documents
      const documentRows = buildDocumentRows(mtg.documents);
      if (documentRows.length > 0) {
        const result = await prisma.meetingDocument.createMany({
          data: documentRows.map((doc) => ({ ...doc, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} document(s)`);
      }

      // Map and insert transcript lines
      const lines = mapSegments(segments);

      if (lines.length > 0) {
        const count = await insertLinesInBatches(prisma, meeting.id, lines);
        totalLinesInserted += count;
        log(`  ✔ Inserted ${count} transcript line(s)`);
      } else {
        warn(`  No valid transcript lines after mapping`);
      }

      meetingsImported++;
    }

    // -- Summary ---------------------------------------------------------------

    log("");
    log("═══════════════════════════════════════════════");
    log(`  Import complete for ${city.name}, ${city.stateName}`);
    log(`  Meetings imported: ${meetingsImported}`);
    log(`  Meetings skipped:  ${meetingsSkipped}`);
    log(`  Transcript lines:  ${totalLinesInserted}`);
    log("═══════════════════════════════════════════════");
  } catch (error) {
    // @inquirer/prompts throws ExitPromptError on Ctrl-C
    if (error?.name === "ExitPromptError") {
      log("\nAborted by user.");
      process.exit(0);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`${TAG} ✖  Unexpected error:`, error);
  process.exitCode = 1;
});
