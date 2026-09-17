"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY } from "@/app/lib/glossary";

/**
 * Click-to-open (not hover-only) glossary popover for a single term
 * (US-GLOSSARY-001). Hover-only tooltips (the app's existing pattern —
 * a bare `title=` attribute, see TabbedPanel.tsx/TopicsPanel.tsx) don't
 * work on touch and aren't reliably keyboard-operable, so this is a real
 * `<button>` with `aria-expanded`, closes on Escape or an outside click,
 * and reads its copy from the shared `app/lib/glossary.ts` module so the
 * tooltip and the standalone `/glossary` page can't drift.
 *
 * Meant for known call sites (panel headings, tab labels, agenda-item
 * labels, status badges) — not for auto-scanning rendered summary prose,
 * which already carries its own spliced inline citation links
 * (AnnotatedText) that a second text-splicing pass risks mangling.
 */
export default function GlossaryTerm({
  id,
  children,
  className,
}: {
  /** Glossary entry id — a key in `GLOSSARY` (app/lib/glossary.ts). */
  id: string;
  /** Inline trigger content; defaults to the entry's own display term. */
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!entry) {
    // Unknown id (typo, or an entry removed from glossary.ts) — degrade to
    // plain text rather than taking down whatever panel renders this.
    return <>{children}</>;
  }

  return (
    <span ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        className={
          className ??
          "underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-2 cursor-help rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        }
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          id={popoverId}
          className="absolute z-30 left-0 top-full mt-1 w-64 max-w-[80vw] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3 text-sm text-gray-700 dark:text-gray-300"
        >
          <span className="block font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {entry.term}
          </span>
          {entry.definition}
        </span>
      )}
    </span>
  );
}
