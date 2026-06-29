"use client";

import YouTubePlayer from "./YouTubePlayer";

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

export default function VideoPlayer({ videoUrl, videoProvider }: Props) {
  if (videoProvider === "youtube") {
    const videoId = extractYouTubeId(videoUrl);
    if (videoId) return <YouTubePlayer videoId={videoId} />;
  }

  if (videoProvider === "mp4") {
    return (
      <video
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

  if (videoProvider === "granicus") {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
      >
        Watch on Granicus →
      </a>
    );
  }

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
    >
      Watch video →
    </a>
  );
}
