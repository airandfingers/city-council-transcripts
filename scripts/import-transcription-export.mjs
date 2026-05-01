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
 * Prefers structured_* arrays (with timestamps) over plain-text arrays.
 * Falls back to plain-text arrays if structured versions are missing.
 *
 * @param {Record<string, unknown> | null | undefined} summary
 * @returns {Array<Record<string, unknown>>}
 */
function buildSummaryItems(summary) {
  if (!summary) return [];

  const items = [];

  // --- Key Decisions ---
  const structuredKD = Array.isArray(summary.structured_key_decisions)
    ? summary.structured_key_decisions
    : null;
  if (structuredKD) {
    for (let i = 0; i < structuredKD.length; i++) {
      const d = structuredKD[i];
      const text = typeof d.text === "string" ? d.text.trim() : "";
      if (!text) continue;
      items.push({
        type: "KEY_DECISION",
        text,
        sortOrder: i,
        startTimeSeconds: d.start_time_seconds ?? null,
        endTimeSeconds: d.end_time_seconds ?? null,
        timecodeLabel: d.timecode_label ?? null,
        segmentIndex: d.segment_index ?? d.segment_indices?.start_index ?? null,
        segmentIndexEnd: d.segment_indices?.end_index ?? null,
        linkStatus: d.link_status ?? null,
        confidence: d.confidence ?? null,
        notes: d.notes ?? null,
      });
    }
  } else if (Array.isArray(summary.key_decisions)) {
    for (let i = 0; i < summary.key_decisions.length; i++) {
      const text = typeof summary.key_decisions[i] === "string" ? summary.key_decisions[i].trim() : "";
      if (text) items.push({ type: "KEY_DECISION", text, sortOrder: i });
    }
  }

  // --- Action Items ---
  const structuredAI = Array.isArray(summary.structured_action_items)
    ? summary.structured_action_items
    : null;
  if (structuredAI) {
    for (let i = 0; i < structuredAI.length; i++) {
      const d = structuredAI[i];
      const text = typeof d.text === "string" ? d.text.trim() : "";
      if (!text) continue;
      items.push({
        type: "ACTION_ITEM",
        text,
        sortOrder: i,
        startTimeSeconds: d.start_time_seconds ?? null,
        endTimeSeconds: d.end_time_seconds ?? null,
        timecodeLabel: d.timecode_label ?? null,
        segmentIndex: d.segment_index ?? d.segment_indices?.start_index ?? null,
        segmentIndexEnd: d.segment_indices?.end_index ?? null,
        linkStatus: d.link_status ?? null,
        confidence: d.confidence ?? null,
        notes: d.notes ?? null,
      });
    }
  } else if (Array.isArray(summary.action_items)) {
    for (let i = 0; i < summary.action_items.length; i++) {
      const text = typeof summary.action_items[i] === "string" ? summary.action_items[i].trim() : "";
      if (text) items.push({ type: "ACTION_ITEM", text, sortOrder: i });
    }
  }

  // --- Motions and Votes (no structured version yet, plain-text only) ---
  if (Array.isArray(summary.motions_and_votes)) {
    for (let i = 0; i < summary.motions_and_votes.length; i++) {
      const text = typeof summary.motions_and_votes[i] === "string" ? summary.motions_and_votes[i].trim() : "";
      if (text) items.push({ type: "MOTION_AND_VOTE", text, sortOrder: i });
    }
  }

  // --- Public Comments (individual structured entries) ---
  const structuredPC = Array.isArray(summary.structured_public_comments)
    ? summary.structured_public_comments
    : null;
  if (structuredPC) {
    for (let i = 0; i < structuredPC.length; i++) {
      const d = structuredPC[i];
      const text = typeof d.summary === "string" ? d.summary.trim() : "";
      if (!text) continue;
      items.push({
        type: "PUBLIC_COMMENT",
        text,
        sortOrder: i,
        speaker: d.speaker ?? null,
        position: d.position ?? null,
        startTimeSeconds: d.start_time_seconds ?? null,
        endTimeSeconds: d.end_time_seconds ?? null,
        timecodeLabel: d.timecode_label ?? null,
        segmentIndex: d.segment_index ?? null,
        linkStatus: d.link_status ?? null,
        confidence: d.confidence ?? null,
      });
    }
  } else if (Array.isArray(summary.public_comments)) {
    for (let i = 0; i < summary.public_comments.length; i++) {
      const d = summary.public_comments[i];
      const text = typeof d.summary === "string" ? d.summary.trim() : (typeof d === "string" ? d.trim() : "");
      if (!text) continue;
      items.push({
        type: "PUBLIC_COMMENT",
        text,
        sortOrder: i,
        speaker: d.speaker ?? null,
        position: d.position ?? null,
      });
    }
  }

  // --- Public Comment Summary (aggregate narrative) ---
  const publicCommentsSummary =
    typeof summary.public_comments_summary === "string"
      ? summary.public_comments_summary.trim()
      : "";
  if (publicCommentsSummary) {
    items.push({ type: "PUBLIC_COMMENT_SUMMARY", text: publicCommentsSummary, sortOrder: 0 });
  }

  // --- Timeline Bullets ---
  if (Array.isArray(summary.timeline_bullets)) {
    for (let i = 0; i < summary.timeline_bullets.length; i++) {
      const d = summary.timeline_bullets[i];
      const text = typeof d.text === "string" ? d.text.trim() : "";
      if (!text) continue;
      items.push({
        type: "TIMELINE_BULLET",
        text,
        sortOrder: i,
        startTimeSeconds: d.start_time_seconds ?? null,
        endTimeSeconds: d.end_time_seconds ?? null,
        timecodeLabel: d.timecode_label ?? null,
        segmentIndex: d.segment_index ?? null,
        linkStatus: d.link_status ?? null,
        confidence: d.confidence ?? null,
      });
    }
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

/**
 * Return the array as a Json value if non-empty, or undefined to omit.
 * @param {unknown} arr
 * @returns {unknown[] | undefined}
 */
function nonEmptyJsonArray(arr) {
  return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
}

/**
 * Parse a meeting-level YouTube offset from known export shapes.
 * Supports both top-level source_offsets and metadata.source_offsets.
 *
 * @param {Record<string, unknown>} mtg
 * @returns {number | null}
 */
function parseYoutubeOffsetSeconds(mtg) {
  const direct = Number(mtg.source_offsets?.youtube?.offset_seconds);
  if (Number.isFinite(direct)) return direct;

  const fromMetadata = Number(mtg.metadata?.source_offsets?.youtube?.offset_seconds);
  if (Number.isFinite(fromMetadata)) return fromMetadata;

  return null;
}

/**
 * Build TopicSummary rows from the export topic_summaries array.
 *
 * @param {Array<Record<string, unknown>> | null | undefined} topicSummaries
 * @returns {Array<Record<string, unknown>>}
 */
function buildTopicSummaryRows(topicSummaries) {
  if (!Array.isArray(topicSummaries) || topicSummaries.length === 0) return [];

  const seenIds = new Set();

  return topicSummaries.map((t, i) => {
    let topicId = t.topic_id ?? `topic_${i}`;
    if (seenIds.has(topicId)) {
      topicId = `${topicId}_${i}`;
    }
    seenIds.add(topicId);

    return {
    topicId,
    title: t.topic_title ?? "",
    startTime: Number(t.start_time ?? 0),
    endTime: Number(t.end_time ?? 0),
    sortOrder: i,
    summaryText: t.summary_text || null,
    keyPoints: nonEmptyJsonArray(t.key_points),
    speakers: nonEmptyJsonArray(t.speakers),
    speakerPositions: nonEmptyJsonArray(t.speaker_positions),
    outcome: t.outcome || null,
    tags: nonEmptyJsonArray(t.tags),
    provider: t.provider ?? null,
    model: t.model ?? null,
    generatedAt: t.generated_at ? new Date(t.generated_at) : null,
  };
  });
}

/**
 * Build SpeakerSummary rows from the export speaker_summaries object.
 *
 * @param {Record<string, unknown> | null | undefined} speakerSummaries
 * @returns {Array<Record<string, unknown>>}
 */
function buildSpeakerSummaryRows(speakerSummaries) {
  const speakers = speakerSummaries?.speakers;
  if (!Array.isArray(speakers) || speakers.length === 0) return [];

  const seenUuids = new Set();

  return speakers.map((s, i) => {
    let speakerUuid = s.speaker_uuid ?? null;
    if (speakerUuid && seenUuids.has(speakerUuid)) {
      speakerUuid = `${speakerUuid}_${i}`;
    }
    if (speakerUuid) seenUuids.add(speakerUuid);

    return {
    speakerUuid,
    speakerName: s.speaker_name ?? "UNKNOWN",
    segmentCount: s.segment_count ?? null,
    speakingTime: s.speaking_time_seconds ?? null,
    sortOrder: i,
    summaryText: s.summary_text || null,
    keyQuotes: nonEmptyJsonArray(s.key_quotes),
    actionsOrMotions: nonEmptyJsonArray(s.actions_or_motions),
    positionsByTopic: nonEmptyJsonArray(s.positions_by_topic),
    provider: s.provider ?? null,
    model: s.model ?? null,
    generatedAt: s.generated_at ? new Date(s.generated_at) : null,
  };
  });
}

/**
 * Build MeetingSegment rows from the export section_summaries object.
 *
 * Each section in section_summaries.sections[] becomes a row.
 * Uses the explicit `skip` flag from v1.4.0 exports, falling back to
 * time_range comparison for older exports.
 *
 * @param {Record<string, unknown> | null | undefined} sectionSummaries
 * @returns {Array<Record<string, unknown>>}
 */
function buildSegmentRows(sectionSummaries) {
  const sections = sectionSummaries?.sections;
  if (!Array.isArray(sections)) return [];

  // Track seen itemIds to deduplicate (some exports have duplicate agenda_item_ids)
  const seenIds = new Set();

  return sections.map((s, i) => {
    const startTime = Array.isArray(s.time_range) ? Number(s.time_range[0]) : 0;
    const endTime = Array.isArray(s.time_range) ? Number(s.time_range[1]) : 0;

    let itemId = s.agenda_item_id ?? `section_${i}`;
    if (seenIds.has(itemId)) {
      itemId = `${itemId}_${i}`;
    }
    seenIds.add(itemId);

    return {
      itemId,
      itemNumber: s.agenda_item_number ?? "",
      title: s.agenda_item_title ?? "",
      startTime,
      endTime,
      durationSeconds: s.duration_seconds ?? null,
      skip: s.skip ?? startTime === endTime,
      skipReason: s.skip_reason ?? null,
      sortOrder: i,
      discussionSummary: s.discussion_summary || null,
      officialAction: s.official_action || null,
      tags: nonEmptyJsonArray(s.tags),
      speakerPositions: nonEmptyJsonArray(s.speaker_positions),
      keyQuotes: nonEmptyJsonArray(s.key_quotes),
      publicComments: nonEmptyJsonArray(s.public_comments),
      discrepancies: nonEmptyJsonArray(s.discrepancies),
      sourcesUsed: nonEmptyJsonArray(s.sources_used),
      sourceMinutesAvailable: s.source_minutes_available ?? null,
      sourceAgendaAvailable: s.source_agenda_available ?? null,
      provider: s.provider ?? null,
      model: s.model ?? null,
      generatedAt: s.generated_at ? new Date(s.generated_at) : null,
    };
  });
}

/**
 * Build MinutesItem rows from the export minutes_timestamps object.
 *
 * Each item in minutes_timestamps.items[] becomes a row.
 * Uses the same skip logic as segments (start === end means skipped).
 *
 * @param {Record<string, unknown> | null | undefined} minutesTimestamps
 * @returns {Array<Record<string, unknown>>}
 */
function buildMinutesItemRows(minutesTimestamps) {
  const items = minutesTimestamps?.items;
  if (!Array.isArray(items)) return [];

  const seenIds = new Set();

  return items.map((item, i) => {
    const startTime = Number(item.start_time_seconds ?? 0);
    const endTime = Number(item.end_time_seconds ?? 0);

    let itemId = item.item_id ?? `item_${i}`;
    if (seenIds.has(itemId)) {
      itemId = `${itemId}_${i}`;
    }
    seenIds.add(itemId);

    return {
      itemId,
      itemNumber: item.item_number ?? "",
      title: item.title ?? "",
      startTime,
      endTime,
      durationSeconds: item.duration_seconds ?? null,
      skip: startTime === endTime,
      sortOrder: i,
      parentItemId: item.parent_item_id ?? null,
      itemType: item.item_type ?? "unknown",
      alignmentConfidence: item.alignment_confidence ?? null,
      alignmentMethod: item.alignment_method ?? null,
      agendaItemId: item.agenda_item_id ?? null,
      startTimecode: item.start_timecode ?? null,
      endTimecode: item.end_timecode ?? null,
      textLineStart: item.text_line_start ?? null,
      textLineEnd: item.text_line_end ?? null,
      segmentIndices:
        Array.isArray(item.segment_indices) && item.segment_indices.length > 0
          ? item.segment_indices
          : typeof item.segment_indices === "object" && item.segment_indices !== null
            ? item.segment_indices
            : undefined,
    };
  });
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
          logline: mtg.summary?.logline ?? null,
          timelineBullets: nonEmptyJsonArray(mtg.summary?.timeline_bullets),
          youtubeUrl: mtg.youtube_url ?? null,
          youtubeOffsetSeconds: parseYoutubeOffsetSeconds(mtg),
          granicusUrl: mtg.granicus_url ?? null,
          minutesText: mtg.minutes?.text ?? null,
          minutesUrl: mtg.minutes?.portal_url ?? null,
          minutesGeneratedAt: mtg.minutes_timestamps?.generated_at
            ? new Date(mtg.minutes_timestamps.generated_at)
            : null,
          minutesTotalItems: mtg.minutes_timestamps?.total_items ?? null,
          minutesAlignedCount: mtg.minutes_timestamps?.aligned_count ?? null,
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

      // Insert meeting segments (from section_summaries)
      const segmentRows = buildSegmentRows(mtg.section_summaries);
      if (segmentRows.length > 0) {
        const result = await prisma.meetingSegment.createMany({
          data: segmentRows.map((row) => ({ ...row, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} segment(s)`);
      }

      // Insert minutes items (from minutes_timestamps)
      const minutesItemRows = buildMinutesItemRows(mtg.minutes_timestamps);
      if (minutesItemRows.length > 0) {
        const result = await prisma.minutesItem.createMany({
          data: minutesItemRows.map((row) => ({ ...row, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} minutes item(s)`);
      }

      // Insert topic summaries
      const topicRows = buildTopicSummaryRows(mtg.topic_summaries);
      if (topicRows.length > 0) {
        const result = await prisma.topicSummary.createMany({
          data: topicRows.map((row) => ({ ...row, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} topic summary(ies)`);
      }

      // Insert speaker summaries
      const speakerRows = buildSpeakerSummaryRows(mtg.speaker_summaries);
      if (speakerRows.length > 0) {
        const result = await prisma.speakerSummary.createMany({
          data: speakerRows.map((row) => ({ ...row, meetingId: meeting.id })),
        });
        log(`  ✔ Inserted ${result.count} speaker summary(ies)`);
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
