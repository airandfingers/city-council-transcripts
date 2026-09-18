"use client";

import { useState } from "react";

/**
 * Share the current page: the native share sheet where the browser offers
 * one (phones), a clipboard copy everywhere else. Reads the URL at click
 * time rather than taking it as a prop, so it stays correct for whatever
 * page it's dropped on.
 */
export default function ShareButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        /* Dismissed share sheet — fall through to copying. */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* No clipboard permission — nothing useful left to try. */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={
        className ??
        "cursor-pointer rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
      }
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
