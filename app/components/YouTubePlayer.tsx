"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
 *
 * The IFrame API script + player still load eagerly on mount, same as
 * before — NOT deferred behind a click. A true click-to-load facade was
 * considered for FEAT-VIDEO-POSTER-001 (matching the AC's literal wording)
 * but rejected: TimestampLink's in-page citation seeking
 * (VideoSyncProvider.seekTo/play) silently no-ops until registerPlayer()
 * has fired, so deferring load until a user clicks the video itself would
 * break "click a citation timestamp before ever pressing play" — a more
 * central feature than the poster is cosmetic. Instead, a real thumbnail
 * (`img.youtube.com/vi/<id>/hqdefault.jpg`) is layered on top of the
 * loading iframe and removed once `onReady` fires, which fully addresses
 * the "looks like a broken black box" complaint without touching load
 * timing or registration order.
 */
export default function YouTubePlayer({ videoId }: { videoId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerPlayer } = useVideoSync();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

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
              setReady(true);
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
    <div className="relative aspect-video w-full">
      <div
        ref={containerRef}
        className="absolute inset-0 [&_iframe]:rounded-lg"
      />
      {!ready && (
        // Decorative — the poster is purely cosmetic cover for the loading
        // iframe underneath, not an interactive element (see class doc
        // comment above for why this isn't a click-to-load facade).
        // `ready` only flips on a real `onReady`, so if the IFrame API
        // script never loads at all (blocked/offline), this poster stays
        // up permanently over a dead container — not a regression (today's
        // failure mode there is an empty div), but worth knowing: it now
        // *looks* playable in that case when it isn't.
        <div className="absolute inset-0 overflow-hidden rounded-lg bg-black pointer-events-none">
          <Image
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
