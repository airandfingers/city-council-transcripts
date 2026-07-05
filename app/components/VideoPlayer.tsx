"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import YouTubePlayer from "./YouTubePlayer";
import CopyTimecode from "./CopyTimecode";

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

  useEffect(() => {
    const startSeconds = Number(searchParams.get("t")) || 0;
    const video = videoRef.current;
    if (!video || startSeconds <= 0) return;
    const seek = () => {
      video.currentTime = startSeconds;
    };
    if (video.readyState >= 1) {
      seek();
    } else {
      video.addEventListener("loadedmetadata", seek, { once: true });
      return () => video.removeEventListener("loadedmetadata", seek);
    }
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

/** External-link-only providers (Granicus, unknown future providers) can't
 * be seeked programmatically — surface the requested timecode as copyable
 * text instead of silently dropping it. */
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
    return <ExternalLinkVideo videoUrl={videoUrl} label="Watch on Granicus →" />;
  }

  // Unknown provider — same link-out + copy-timecode fallback as granicus.
  // app/lib/videoSeek.ts's canAutoSeek() is the source of truth for which
  // providers get a real seekable player; keep that list and this dispatch
  // in sync when adding a new provider.
  return <ExternalLinkVideo videoUrl={videoUrl} label="Watch video →" />;
}
