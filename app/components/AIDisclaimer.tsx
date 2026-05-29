const DISCLAIMER_TEXT =
  "Transcripts and summaries on this site are produced by automated transcription and AI summarization with minimal human review. Details may be inaccurate, incomplete, or misattributed — verify against the official meeting recording before relying on them.";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9.25a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0v-4.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export type AIDisclaimerProps = {
  variant?: "footer" | "inline";
  className?: string;
};

/**
 * Site-wide AI/robot disclaimer.
 *
 * - `variant="footer"` (default): muted, top-bordered footer for the bottom of a page.
 * - `variant="inline"`: slightly more prominent callout for placing near AI-generated
 *   summary content (e.g. on the transcript detail page).
 *
 * Both variants share the same copy so the disclosure stays consistent across the site.
 */
export default function AIDisclaimer({
  variant = "footer",
  className = "",
}: AIDisclaimerProps) {
  if (variant === "inline") {
    return (
      <aside
        role="note"
        aria-label="AI-generated content notice"
        className={`flex items-start gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${className}`}
      >
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
        <p>{DISCLAIMER_TEXT}</p>
      </aside>
    );
  }

  return (
    <footer
      role="contentinfo"
      className={`mt-12 border-t border-gray-200 dark:border-gray-700 pt-4 ${className}`}
    >
      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>{DISCLAIMER_TEXT}</p>
      </div>
    </footer>
  );
}
