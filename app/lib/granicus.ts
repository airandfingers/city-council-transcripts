/**
 * Granicus embed URLs (FIX-GRANICUS-EMBED-SEEK-001).
 *
 * The Granicus player takes the start time as `entrytime=<seconds>` and
 * `autostart=0|1`, plus `embed=1` for the chrome-less embedded view. These
 * are the parameters its own "embed code" generator writes.
 */

/** Hosts we'll put in an iframe. The URL comes from our own database, but an
 * iframe of an arbitrary URL is a bigger trust step than a link, so anything
 * else falls back to the plain link. */
function isGranicusHost(hostname: string): boolean {
  return hostname === "granicus.com" || hostname.endsWith(".granicus.com");
}

/** Embed URL for `videoUrl` starting at `seconds`, or null when the URL
 * isn't an https granicus.com URL. */
export function granicusEmbedUrl(
  videoUrl: string,
  seconds: number,
  autostart: boolean,
): string | null {
  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !isGranicusHost(url.hostname)) return null;
  const start = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  if (start > 0) url.searchParams.set("entrytime", String(start));
  else url.searchParams.delete("entrytime");
  url.searchParams.set("autostart", autostart ? "1" : "0");
  url.searchParams.set("embed", "1");
  return url.toString();
}
