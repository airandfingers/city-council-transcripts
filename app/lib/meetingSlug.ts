/**
 * Normalizes text into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds deterministic meeting slugs from city/date/title.
 */
export function buildMeetingSlug(input: {
  citySlug: string;
  date: Date | string;
  title: string;
}): string {
  const dateValue =
    typeof input.date === "string" ? new Date(input.date) : input.date;

  const isoDate = Number.isNaN(dateValue.getTime())
    ? "unknown-date"
    : dateValue.toISOString().slice(0, 10);

  return `${slugify(input.citySlug)}-${isoDate}-${slugify(input.title)}`;
}
