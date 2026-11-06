"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import YouTubePlayer from "./YouTubePlayer";
import CopyTimecode from "./CopyTimecode";
import { useVideoSync, type SyncablePlayer } from "./VideoSyncProvider";
import { granicusEmbedUrl } from "@/app/lib/granicus";

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

type Props = {
  videoUrl: string;
  videoProvider: string;
};

function Mp4Player({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchParams = useSearchParams();
  const { registerPlayer } = useVideoSync();

  useEffect(() => {
    const startSeconds = Number(searchParams.get("t")) || 0;
    const video = videoRef.current;
    if (!video) return;
    const seek = () => {
      if (startSeconds > 0) video.currentTime = startSeconds;
    };
    if (video.readyState >= 1) {
      seek();
    } else {
      video.addEventListener("loadedmetadata", seek, { once: true });
    }

    // Register with VideoSyncProvider so TimestampLink's seekTo()/play()
    // (used for in-page clicks on inline summary/transcript timecodes)
    // actually reach this player — previously only YouTubePlayer did this,
    // so clicking a timecode on an mp4-hosted meeting silently no-op'd.
    const adapter: SyncablePlayer = {
      seekTo: (seconds) => {
        video.currentTime = seconds;
      },
      playVideo: () => {
        void video.play();
      },
      getCurrentTime: () => video.currentTime,
      addEventListener: (event, handler) => {
        if (event !== "onStateChange") return;
        const onPlay = () => handler({ data: 1 });
        const onPause = () => handler({ data: 2 });
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
      },
    };
    registerPlayer(adapter);

    return () => {
      video.removeEventListener("loadedmetadata", seek);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full rounded-lg bg-black"
      preload="metadata"
    >
      <source src={videoUrl} type="video/mp4" />
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        Watch video →
      </a>
    </video>
  );
}

/** Embedded Granicus player (FIX-GRANICUS-EMBED-SEEK-001). Granicus has no
 * script API we can reach across origins, but its player honors
 * `entrytime=<seconds>` when embedded (`embed=1`), the same URL its own
 * "embed code" generator builds. A seek swaps the iframe's src, which reloads
 * the player at the new time; autostart=1 then plays it, since the click
 * that asked for the seek counts as the user gesture.
 *
 * Verified 2026-11-05 in Playwright's bundled WebKit against the Nov 4, 2026
 * Monterey Park clip (1206): `entrytime=600` started at 606 s, and a src swap
 * to 3000 landed at 3004 s. The 2026-09-17 note that said entrytime "doesn't
 * seek" came from headless Chromium, which can't decode the H.264 stream at
 * all, so `currentTime` stayed 0 whatever the URL said.
 *
 * Playback position can't be read back, so the transcript doesn't follow
 * along as it does for YouTube/mp4: getCurrentTime() stays 0 and the player
 * never reports "playing". Citation clicks still scroll the transcript
 * (TimestampLink -> scrollToTime). */
function GranicusPlayer({ videoUrl }: { videoUrl: string }) {
  const searchParams = useSearchParams();
  const { registerPlayer } = useVideoSync();
  const startSeconds = Number(searchParams.get("t")) || 0;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Initial load: positioned at ?t= but paused (no gesture yet, and a page
  // that starts playing on its own is rude). Computed once: later seeks set
  // the iframe's src directly, so React never re-renders it back.
  const [initialSrc] = useState(() => granicusEmbedUrl(videoUrl, startSeconds, false));

  useEffect(() => {
    // Not embeddable (not an https granicus.com URL): no player to register,
    // so TimestampLink keeps its no-player behavior for the link fallback.
    if (!initialSrc) return;
    const adapter: SyncablePlayer = {
      seekTo: (seconds) => {
        const next = granicusEmbedUrl(videoUrl, seconds, true);
        // Assigning src, even to the same URL, reloads the frame, so a second
        // click on the same timecode restarts there too. The element is never
        // remounted (see DockableVideo).
        if (next && iframeRef.current) iframeRef.current.src = next;
      },
      playVideo: () => {},
      getCurrentTime: () => 0,
      addEventListener: () => {},
    };
    registerPlayer(adapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialSrc) {
    return <ExternalLinkVideo videoUrl={videoUrl} label="Watch on Granicus →" />;
  }
  // No separate "open on Granicus" link here: the page header already links
  // the video, and anything inside this component also shows in the docked
  // mini-player.
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        ref={iframeRef}
        src={initialSrc}
        title="Meeting video (Granicus)"
        className="h-full w-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

/** Link-out fallback for providers with no embeddable player (unknown
 * future providers, or a Granicus URL that isn't on a granicus.com host):
 * surface the requested timecode as copyable text instead of silently
 * dropping it. */
function ExternalLinkVideo({
  videoUrl,
  label,
}: {
  videoUrl: string;
  label: string;
}) {
  const searchParams = useSearchParams();
  const startSeconds = Number(searchParams.get("t")) || 0;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
      >
        {label}
      </a>
      {startSeconds > 0 && <CopyTimecode seconds={startSeconds} />}
    </div>
  );
}

export default function VideoPlayer({ videoUrl, videoProvider }: Props) {
  if (videoProvider === "youtube") {
    const videoId = extractYouTubeId(videoUrl);
    if (videoId) return <YouTubePlayer videoId={videoId} />;
  }

  if (videoProvider === "mp4") {
    return <Mp4Player videoUrl={videoUrl} />;
  }

  if (videoProvider === "granicus") {
    return <GranicusPlayer videoUrl={videoUrl} />;
  }

  // Unknown provider — link-out + copy-timecode fallback.
  // app/lib/videoSeek.ts's canAutoSeek() is the source of truth for which
  // providers get a real seekable player; keep that list and this dispatch
  // in sync when adding a new provider.
  return <ExternalLinkVideo videoUrl={videoUrl} label="Watch video →" />;
}
