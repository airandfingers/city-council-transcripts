"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import CopyTimecode from "@/app/components/CopyTimecode";
import { formatMeetingDate } from "@/app/lib/formatDate";
import { formatSeconds, buildTranscriptTimestampUrl } from "@/app/lib/videoSeek";

/** A single playable moment, as selected by clicking a timecode chip. */
export type TopicMoment = {
  videoUrl: string;
  videoProvider: string;
  /** Transcript-time seconds — what the deep link and label use. */
  seconds: number;
  /** Video-time seconds (offset-mapped), null when the offset model has
   *  no mapping for this point (see app/lib/offset.ts). */
  videoSeconds: number | null;
  label: string | null;
  meetingSlug: string;
  meetingTitle: string;
  meetingDate: Date;
};

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

/**
 * The topic page's video slot: empty until the reader clicks a timecode,
 * then plays *that* meeting at *that* moment without leaving the topic.
 *
 * Deliberately not the transcript page's VideoPlayer/VideoSyncProvider
 * pair. Those assume one recording per page and read the start time from
 * `?t=` in the URL; a topic spans many meetings, so the source itself
 * changes on every click. Here the moment is a prop, the element is keyed
 * by it so a new selection remounts cleanly, and YouTube uses a plain
 * `start=`-parameterised embed rather than the IFrame API — there is no
 * in-page seeking to coordinate, only a fresh load.
 */
export default function TopicVideoPanel({ moment }: { moment: TopicMoment | null }) {
  if (!moment) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 aspect-video flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Video appears here</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Click any timecode to watch that moment
        </p>
      </div>
    );
  }

  const start = Math.floor(moment.videoSeconds ?? moment.seconds);

  return (
    <div>
      {moment.videoProvider === "mp4" ? (
        <Mp4Moment key={`${moment.videoUrl}#${start}`} url={moment.videoUrl} start={start} />
      ) : moment.videoProvider === "youtube" && extractYouTubeId(moment.videoUrl) ? (
        <iframe
          key={`${moment.videoUrl}#${start}`}
          className="w-full aspect-video rounded-lg bg-black"
          src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(moment.videoUrl)}?start=${start}&rel=0`}
          title={moment.meetingTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        /* Providers with no embeddable player (Granicus and friends) keep
           the timecode visible and copyable rather than dropping it —
           same fallback the transcript page uses. */
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm">
          <a
            href={moment.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Watch this meeting →
          </a>
          <div className="mt-2">
            <CopyTimecode seconds={moment.seconds} label={moment.label ?? undefined} />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{moment.meetingTitle}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatMeetingDate(moment.meetingDate)} ·{" "}
            <span className="font-mono">{moment.label?.trim() || formatSeconds(moment.seconds)}</span>
          </p>
        </div>
        <Link
          href={buildTranscriptTimestampUrl(moment.meetingSlug, moment.seconds)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          Transcript →
        </Link>
      </div>
    </div>
  );
}

function Mp4Moment({ url, start }: { url: string; start: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || start <= 0) return;
    const seek = () => {
      video.currentTime = start;
    };
    if (video.readyState >= 1) {
      seek();
    } else {
      video.addEventListener("loadedmetadata", seek, { once: true });
      return () => video.removeEventListener("loadedmetadata", seek);
    }
  }, [start]);

  return (
    <video ref={ref} controls preload="metadata" className="w-full aspect-video rounded-lg bg-black">
      <source src={url} type="video/mp4" />
      <a href={url} target="_blank" rel="noopener noreferrer">
        Watch video →
      </a>
    </video>
  );
}
