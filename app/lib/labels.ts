/**
 * Plain-language labels and explanations for civic terminology.
 *
 * PoC testers who don't consider themselves "civically engaged" said
 * the site read as jargon ("not sure what motions and votes mean") and
 * asked for accessible language with short explanations. This module is
 * the single place those labels/descriptions live so every panel that
 * shows a `MeetingSummaryItem.type` stays consistent.
 *
 * @module labels
 */

export type SummaryTypeInfo = {
  /** Plain-language label shown as a heading/tab. */
  label: string;
  /** One-sentence, jargon-free explanation of what this section contains. */
  description: string;
};

export const SUMMARY_TYPE_INFO: Record<string, SummaryTypeInfo> = {
  KEY_DECISION: {
    label: "Key Decisions",
    description: "What the council actually decided at this meeting.",
  },
  ACTION_ITEM: {
    label: "Action Items",
    description: "Tasks or follow-ups the council or staff committed to.",
  },
  MOTION_AND_VOTE: {
    label: "Motions & Votes",
    description:
      "A \"motion\" is a formal proposal a council member puts forward; the \"vote\" is how each member responded to it.",
  },
  PUBLIC_COMMENT: {
    label: "Public Comments",
    description: "What residents said during the public comment period.",
  },
  PUBLIC_COMMENT_SUMMARY: {
    label: "Public Comment Summary",
    description: "A short summary of the public comment period.",
  },
  TIMELINE_BULLET: {
    label: "Timeline",
    description: "A chronological outline of what happened, in order.",
  },
};

/**
 * Returns the plain-language label for a `MeetingSummaryItem.type`,
 * falling back to the raw type if it isn't recognized.
 */
export function summaryTypeLabel(type: string): string {
  return SUMMARY_TYPE_INFO[type]?.label ?? type;
}

/**
 * Returns the plain-language description for a `MeetingSummaryItem.type`,
 * or undefined if there isn't one.
 */
export function summaryTypeDescription(type: string): string | undefined {
  return SUMMARY_TYPE_INFO[type]?.description;
}
