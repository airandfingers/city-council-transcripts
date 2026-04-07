/**
 * Map raw export JSON transcript segments to Prisma TranscriptLine create-data
 * objects.
 *
 * Segments with empty or whitespace-only text are dropped with a warning.
 *
 * @param {Array<Record<string, unknown>>} segments
 * @returns {Array<Record<string, unknown>>}  Array of TranscriptLine create shapes (without meetingId).
 */
export function mapSegments(segments) {
  /** @type {Array<Record<string, unknown>>} */
  const mapped = [];
  let skippedCount = 0;
  let lineIndex = 0;

  for (const seg of segments) {
    const rawText = typeof seg.text === "string" ? seg.text.trim() : "";

    if (!rawText) {
      skippedCount++;
      console.warn(
        `  ⚠  Skipping segment id=${seg.id}: empty or whitespace-only text`,
      );
      continue;
    }

    mapped.push({
      lineIndex: lineIndex++,
      startTime: Number(seg.start),
      endTime: Number(seg.end),
      text: rawText,
      speaker: seg.speaker ?? "UNKNOWN",
      speakerName: seg.speaker_name ?? null,
      confidence: typeof seg.speaker_confidence === "number" ? seg.speaker_confidence : 0.0,
      globalSpeakerUuid: seg.global_speaker_uuid ?? null,
    });
  }

  if (skippedCount > 0) {
    console.warn(`  ⚠  ${skippedCount} segment(s) skipped (empty text)`);
  }

  return mapped;
}
