/**
 * Shared types and utilities for transcript display, used by both
 * server and client components.
 */

/** A group of consecutive transcript lines from the same speaker. */
export type GroupedLine = {
  speaker: string;
  speakerName: string | null;
  startTime: number;
  endTime: number;
  text: string;
  firstId: number;
};

/**
 * Format seconds as HH:MM:SS with leading zeros stripped from the hours
 * portion, e.g. 0:00, 4:03, 1:04:03
 */
export function formatTimestamp(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  }
  return `${m}:${ss}`;
}

/**
 * Display "Unknown Speaker" for raw speaker IDs that start with
 * SPEAKER_ or KNOWN_ (case-insensitive).
 */
export function displayName(
  speakerName: string | null,
  speaker: string,
): string {
  const name = speakerName ?? speaker;
  return /^(speaker_|known_)/i.test(name) ? "Unknown Speaker" : name;
}
