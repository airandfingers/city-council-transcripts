import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/app/lib/prisma";
import TopicsPanel from "@/app/components/TopicsPanel";
import type { Topic, Bullet } from "@/app/components/TopicsPanel";
import DocumentsPanel from "@/app/components/DocumentsPanel";
import VideoSyncProvider from "@/app/components/VideoSyncProvider";
import YouTubePlayer from "@/app/components/YouTubePlayer";
import TranscriptViewer from "@/app/components/TranscriptViewer";
import EditableTitle from "@/app/components/EditableTitle";
import SegmentsPanel from "@/app/components/SegmentsPanel";
import SpeakerSummariesPanel from "@/app/components/SpeakerSummariesPanel";
import type { GroupedLine } from "@/app/lib/transcript";

const SUMMARY_TYPE_LABELS: Record<string, string> = {
  KEY_DECISION: "Key Decisions",
  ACTION_ITEM: "Action Items",
  MOTION_AND_VOTE: "Motions & Votes",
  PUBLIC_COMMENT: "Public Comments",
  PUBLIC_COMMENT_SUMMARY: "Public Comment Summary",
  TIMELINE_BULLET: "Timeline",
};

/** Types to exclude from the tabbed panel (shown elsewhere or not useful as tabs) */
const HIDDEN_SUMMARY_TYPES = new Set<string>(["TIMELINE_BULLET", "PUBLIC_COMMENT_SUMMARY"]);

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be") {
      return pathParts[0] ?? null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      // Support common non-watch URL forms.
      // Examples: /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const prefixedPath = ["embed", "shorts", "live", "v"];
      if (pathParts.length >= 2 && prefixedPath.includes(pathParts[0])) {
        return pathParts[1] ?? null;
      }

      // Fallback for uncommon but valid forms where ID is first segment.
      if (pathParts.length >= 1) {
        return pathParts[0] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: segments } = await params;
  const slug = segments.map(decodeURIComponent).join("/");
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!meeting) return { title: "Transcript Not Found" };
  return { title: meeting.title };
}

export default async function TranscriptPage({ params }: Props) {
  const { slug: segments } = await params;
  const slug = segments.map(decodeURIComponent).join("/");

  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      logline: true,
      youtubeUrl: true,
      youtubeOffsetSeconds: true,
      granicusUrl: true,
      minutesText: true,
      minutesUrl: true,
      city: {
        select: {
          id: true,
          name: true,
          slug: true,
          stateCode: true,
        },
      },
      lines: {
        orderBy: { lineIndex: "asc" },
      },
      summaryItems: {
        orderBy: { sortOrder: "asc" },
      },
      documents: true,
      segments: {
        orderBy: { sortOrder: "asc" },
      },
      topicSummaries: {
        orderBy: { sortOrder: "asc" },
      },
      speakerSummaries: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!meeting) {
    notFound();
  }

  const rawYoutubeOffsetSeconds = (meeting as Record<string, unknown>)
    .youtubeOffsetSeconds;
  const videoOffsetSeconds =
    meeting.youtubeUrl && typeof rawYoutubeOffsetSeconds === "number"
      ? rawYoutubeOffsetSeconds
      : 0;

  const applyVideoOffset = (seconds: number): number => {
    // Clamp to zero to avoid negative seek targets when offsets are negative.
    return Math.max(0, seconds + videoOffsetSeconds);
  };

  // Group consecutive lines by the same speaker.
  // Use a double newline as separator when there is a gap of 2.5 s+.
  const groupedLines = meeting.lines.reduce<GroupedLine[]>((groups, line) => {
    const prev = groups[groups.length - 1];
    if (prev && (prev.speakerName ?? prev.speaker) === (line.speakerName ?? line.speaker)) {
      const gap = line.startTime - prev.endTime;
      prev.text += (gap >= 2.5 ? "\n\n" : " ") + line.text;
      prev.endTime = line.endTime;
    } else {
      groups.push({
        speaker: line.speaker,
        speakerName: line.speakerName,
        startTime: line.startTime,
        endTime: line.endTime,
        text: line.text,
        firstId: line.id,
      });
    }
    return groups;
  }, []);

  // Build topics from summary items, grouped by type
  const topicMap = new Map<string, Bullet[]>();
  for (const item of meeting.summaryItems) {
    if (HIDDEN_SUMMARY_TYPES.has(item.type)) continue;
    const list = topicMap.get(item.type) ?? [];
    const startTimeSeconds =
      item.startTimeSeconds != null
        ? applyVideoOffset(item.startTimeSeconds)
        : null;
    list.push({
      text: item.text.replace(/\s*\[minutes\]\s*$/i, ""),
      // Use auto-formatted labels so rendered timestamps always match adjusted seconds.
      timecodeLabel: undefined,
      startTimeSeconds,
      speaker: item.speaker,
      position: item.position,
    });
    topicMap.set(item.type, list);
  }
  const topics: Topic[] = Array.from(topicMap.entries()).map(([type, bullets]) => ({
    label: SUMMARY_TYPE_LABELS[type] ?? type,
    bullets,
  }));

  const segmentsWithOffset = meeting.segments.map((segment) => ({
    ...segment,
    startTime: applyVideoOffset(segment.startTime),
    endTime: applyVideoOffset(segment.endTime),
  }));

  const videoId = meeting.youtubeUrl
    ? extractYouTubeId(meeting.youtubeUrl)
    : null;
  const hasVideo = Boolean(videoId || meeting.granicusUrl);

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        {/* Logo placeholder */}
        <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded shrink-0" aria-hidden="true" />

        {/* City breadcrumb */}
        <Link
          href={`/${meeting.city.stateCode}/${meeting.city.slug}`}
          className="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          {meeting.city.name}
        </Link>

        <span className="text-gray-400 dark:text-gray-500 select-none">/</span>

        {/* Meeting title */}
        <EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />

        {/* Push external links to the right */}
        <div className="flex-1" />

        {meeting.youtubeUrl && (
          <a
            href={meeting.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
          >
            YouTube
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg=="
              alt=""
              className="inline w-2.5 h-2.5 dark:invert"
            />
          </a>
        )}
        {meeting.granicusUrl && (
          <a
            href={meeting.granicusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
          >
            Granicus
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg=="
              alt=""
              className="inline w-2.5 h-2.5 dark:invert"
            />
          </a>
        )}
      </div>

      {meeting.logline && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 -mt-4">
          {meeting.logline}
        </p>
      )}

      <VideoSyncProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <section className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Logline</h2>
          {meeting.logline ? (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {meeting.logline}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No logline available for this meeting yet.
            </p>
          )}
        </section>

        <section className="p-6">
          <TopicsPanel topics={topics} heading="" />
        </section>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transcript */}
          <TranscriptViewer
            groupedLines={groupedLines}
            offsetSeconds={videoOffsetSeconds}
          />

          {/* Video */}
          {hasVideo && (
            <section className="lg:col-span-1 min-w-0">
              <h2 id="video" className="text-2xl font-semibold mb-4">Video</h2>
              {videoId ? (
                <YouTubePlayer videoId={videoId} />
              ) : (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
                  <iframe
                    src={meeting.granicusUrl ?? undefined}
                    title={`${meeting.title} video`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </section>
          )}

          {/* Minutes & Documents */}
          <section className="lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Reference</h2>
            <DocumentsPanel
              minutesText={meeting.minutesText}
              minutesUrl={meeting.minutesUrl}
              documents={meeting.documents}
              extraTabs={[
                ...(meeting.segments.length > 0
                  ? [
                      {
                        label: "Agenda",
                        content: (
                          <SegmentsPanel
                            segments={segmentsWithOffset}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(meeting.speakerSummaries.length > 0
                  ? [
                      {
                        label: "Speakers",
                        content: (
                          <SpeakerSummariesPanel
                            speakers={meeting.speakerSummaries}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        </div>
      </VideoSyncProvider>

      {/* Topic Summaries */}
      {meeting.topicSummaries.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Topic Summaries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meeting.topicSummaries.map((topic) => {
              const keyPoints = Array.isArray(topic.keyPoints)
                ? (topic.keyPoints as string[])
                : [];
              const speakerList = Array.isArray(topic.speakers)
                ? (topic.speakers as (string | { name: string })[])
                : [];
              const speakerNames = speakerList.map((s) =>
                typeof s === "string" ? s : s.name,
              );
              return (
                <div
                  key={topic.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-semibold mb-2">{topic.title}</h3>
                  {topic.summaryText && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {topic.summaryText}
                    </p>
                  )}
                  {keyPoints.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2">
                      {keyPoints.map((kp, i) => (
                        <li key={i}>{kp}</li>
                      ))}
                    </ul>
                  )}
                  {topic.outcome && (
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Outcome: {topic.outcome}
                    </p>
                  )}
                  {speakerNames.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Speakers: {speakerNames.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
}
