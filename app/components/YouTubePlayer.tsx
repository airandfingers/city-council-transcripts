"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useVideoSync } from "./VideoSyncProvider";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Loads the YouTube IFrame API and renders a player that registers itself
 * with the VideoSyncProvider context.  Reads `?t=` from the URL on mount
 * to seek to a specific time when navigating via a shared link.
 */
export default function YouTubePlayer({ videoId }: { videoId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerPlayer } = useVideoSync();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Prevent double-init in strict mode
    let player: YT.Player | null = null;
    let cancelled = false;

    function initPlayer() {
      if (cancelled || !containerRef.current) return;

      // Clear any previous iframe (strict mode re-mount)
      containerRef.current.innerHTML = "";
      const el = document.createElement("div");
      containerRef.current.appendChild(el);

      const startSeconds = Number(searchParams.get("t")) || 0;

      player = new YT.Player(el, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          ...(startSeconds > 0 ? { start: Math.floor(startSeconds) } : {}),
        },
        events: {
          onReady: () => {
            if (!cancelled && player) {
              registerPlayer(player);
            }
          },
        },
      });
    }

    // Load the IFrame API script if not already loaded
    if (typeof window.YT?.Player === "function") {
      initPlayer();
    } else {
      // Store the callback – the API will call it automatically
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      player?.destroy();
    };
    // We intentionally run this only once on mount; videoId & searchParams
    // are expected to be stable for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full [&_iframe]:rounded-lg"
    />
  );
}
