/**
 * The plain transcript page's HTML (FEAT-TRANSCRIPT-PLAIN-PAGE-001), and the
 * browser-side parser TranscriptViewer uses to read it back
 * (FIX-TRANSCRIPT-LAZY-LOAD-001). Kept in one file so the markup and the
 * parser can't drift apart; transcript-text-check covers the round trip.
 *
 * One turn:
 *   <div class="t" data-s="12.5" data-e="40.1" data-i="7381386">
 *     <b>Mayor Jane Doe</b> <span>0:12</span><p>First paragraph</p><p>…</p>
 *   </div>
 * Markup is kept minimal on purpose: every byte is metered as ISR reads.
 */
import { formatTimestamp, type TranscriptTurn } from "@/app/lib/transcript";
import { FALLBACK_SITE_URL } from "@/app/lib/siteUrl";
import { transcriptPath, transcriptTextPath } from "@/app/lib/transcriptPath";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTurnsHtml(turns: TranscriptTurn[]): string {
  return turns
    .map((turn) => {
      const paras = turn.text
        .split("\n\n")
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return (
        `<div class="t" data-s="${turn.startTime}" data-e="${turn.endTime}" data-i="${turn.firstId}">` +
        `<b>${escapeHtml(turn.label)}</b> <span>${formatTimestamp(turn.startTime)}</span>${paras}</div>`
      );
    })
    .join("\n");
}

export function renderTranscriptTextPage(record: {
  slug: string;
  title: string;
  dateLabel: string;
  cityName: string;
  turns: TranscriptTurn[];
}): string {
  const meetingUrl = transcriptPath(record.slug);
  const heading = `${record.title} (${record.dateLabel})`;
  const title = `Transcript: ${heading} — ${record.cityName}`;
  const description = `Full transcript of the ${record.cityName} ${record.title} on ${record.dateLabel}.`;
  const body =
    record.turns.length > 0
      ? renderTurnsHtml(record.turns)
      : "<p>No transcript is available for this meeting yet.</p>";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${SITE_URL}${transcriptTextPath(record.slug)}">
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1rem;color:#222;background:#fff}
@media(prefers-color-scheme:dark){body{color:#ddd;background:#111}a{color:#8ab4f8}}
.t{margin:1.2rem 0}.t span{color:#888;font-size:.85em}.t p{margin:.3rem 0}</style>
</head><body>
<p><a href="${meetingUrl}">← Summary, video and documents for this meeting</a></p>
<h1>${escapeHtml(heading)}</h1>
<p>${escapeHtml(record.cityName)} · Transcript generated automatically from the meeting recording; it may contain errors.</p>
<main>
${body}
</main>
</body></html>`;
}

/** Reads turns back from the plain page's HTML. Browser only (DOMParser). */
export function parseTranscriptTextPage(html: string): TranscriptTurn[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll<HTMLElement>("div.t[data-s]")).map((el) => ({
    label: el.querySelector("b")?.textContent ?? "",
    startTime: Number(el.dataset.s),
    endTime: Number(el.dataset.e),
    firstId: Number(el.dataset.i),
    text: Array.from(el.querySelectorAll("p"))
      .map((p) => p.textContent ?? "")
      .join("\n\n"),
  }));
}
