/**
 * Parse a meeting_key string into its date and raw title components.
 *
 * Format: "YYYY-MM-DD/<raw_title>"
 * Example: "2025-12-17/City_Council__Successor_Agency_1_800s"
 *       → { date: "2025-12-17", rawTitle: "City_Council__Successor_Agency_1_800s" }
 *
 * @param {string} meetingKey
 * @returns {{ date: string | null, rawTitle: string }}
 */
export function parseMeetingKey(meetingKey) {
  const slashIndex = meetingKey.indexOf("/");

  if (slashIndex === -1) {
    return { date: null, rawTitle: meetingKey };
  }

  const datePart = meetingKey.slice(0, slashIndex);
  const rawTitle = meetingKey.slice(slashIndex + 1);

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(datePart);

  return {
    date: isValidDate ? datePart : null,
    rawTitle,
  };
}
