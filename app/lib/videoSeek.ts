/**
 * Per-provider video seek capability.
 *
 * Not every video provider has a way to seek to a timestamp on page load —
 * youtube (IFrame API) and mp4 (native <video> element) do; granicus and any
 * future link-out-only provider don't expose an embeddable/controllable
 * player. Providers without a seek capability still get the timecode
 * surfaced (via a copy-to-clipboard affordance) rather than silently
 * dropping the reference.
 */
const AUTO_SEEK_PROVIDERS = new Set(["youtube", "mp4"]);

export function canAutoSeek(videoProvider: string | null | undefined): boolean {
  return !!videoProvider && AUTO_SEEK_PROVIDERS.has(videoProvider);
}

/** Format seconds as "M:SS" or "H:MM:SS", matching TimestampLink's display. */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Build a cross-page deep link to a transcript at a given timestamp. */
export function buildTranscriptTimestampUrl(slug: string, seconds: number): string {
  const path = slug.split("/").map(encodeURIComponent).join("/");
  return `/transcripts/${path}?t=${Math.floor(seconds)}`;
}
