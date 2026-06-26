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
import AIDisclaimer from "@/app/components/AIDisclaimer";
import TimestampLink from "@/app/components/TimestampLink";
import SubscribeForm from "@/app/components/SubscribeForm";
import type { GroupedLine } from "@/app/lib/transcript";
import { summaryTypeLabel, summaryTypeDescription } from "@/app/lib/labels";
import { resolveOffsetModel } from "@/app/lib/offset";

/** Types to exclude from the tabbed panel (shown elsewhere or not useful as tabs) */
const HIDDEN_SUMMARY_TYPES = new Set<string>(["TIMELINE_BULLET", "PUBLIC_COMMENT_SUMMARY"]);

/** Mailbox for "request this summary" links when topic summaries aren't ready yet. */
const SUMMARY_REQUEST_EMAIL =
  process.env.EMAIL_FROM?.match(/[\w.+-]+@[\w.-]+/)?.[0] ??
  "info@transcripts.ayoshitake.com";

/**
 * Display order for the TLDR tabs — decisions and votes lead because
 * they're what most visitors actually came for; PoC feedback was to put
 * "the main takeaway" at the top rather than make people page through.
 */
const SUMMARY_TYPE_ORDER = [
  "KEY_DECISION",
  "MOTION_AND_VOTE",
  "ACTION_ITEM",
  "PUBLIC_COMMENT",
];

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return parsed.searchParams.get("v");
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
    include: {
      city: true,
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
    // For action items, show only the start time portion of the timecode
    let label = item.timecodeLabel;
    if (item.type === "ACTION_ITEM" && label) {
      label = label.split(/\s*-\s*/)[0];
    }
    list.push({
      text: item.text.replace(/\s*\[minutes\]\s*$/i, ""),
      timecodeLabel: label,
      startTimeSeconds: item.startTimeSeconds,
      speaker: item.speaker,
      position: item.position,
    });
    topicMap.set(item.type, list);
  }
  const topics: Topic[] = Array.from(topicMap.entries())
    .map(([type, bullets]) => ({
      type,
      label: summaryTypeLabel(type),
      description: summaryTypeDescription(type),
      bullets,
    }))
    .sort((a, b) => {
      const ai = SUMMARY_TYPE_ORDER.indexOf(a.type);
      const bi = SUMMARY_TYPE_ORDER.indexOf(b.type);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  // Chronological, timestamped bullets generated alongside the prose
  // overview — the per-bullet timecodes are what let the Summary section
  // deep-link into the transcript/video.
  const timelineBullets = meeting.summaryItems.filter(
    (item) => item.type === "TIMELINE_BULLET",
  );

  const videoId = meeting.youtubeUrl
    ? extractYouTubeId(meeting.youtubeUrl)
    : null;

  // Maps transcript/reference timestamps onto the YouTube recording so the
  // timestamp links seek to the right spot in the video.
  const offsetModel = resolveOffsetModel(
    meeting.youtubeOffsetModel,
    meeting.youtubeOffsetSeconds,
  );

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center gap-3 mb-8 flex-wrap">
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

      {/* TLDR: the main takeaway leads, ahead of the full transcript.
          PoC feedback: "we always want to put the TLDR at the top." */}
      <VideoSyncProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <section className="p-6">
          <h2 className="text-2xl font-semibold mb-4">TL;DR</h2>
          {meeting.logline ? (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {meeting.logline}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No summary available for this meeting yet.
            </p>
          )}
        </section>

        <section className="p-6">
          <TopicsPanel topics={topics} heading="" offsetModel={offsetModel} />
        </section>
      </div>

      {/* Summary: a 1-5 min read that bridges the one-line TL;DR and the
          full transcript. Prefers the prose overview + timestamped timeline
          bullets (most meetings have these); falls back to per-topic cards
          for the older pipeline, then to a request/subscribe prompt when
          nothing has been generated yet. Every piece links to its moment
          in the video/transcript. */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Summary</h2>
        {meeting.summary || timelineBullets.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {meeting.summary && (
              <div className="lg:col-span-2 space-y-3 text-gray-700 dark:text-gray-300">
                {meeting.summary.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
            {timelineBullets.length > 0 && (
              <ul className="lg:col-span-1 space-y-2">
                {timelineBullets.map((item) => (
                  <li key={item.id} className="text-sm flex gap-2">
                    {item.startTimeSeconds != null && (
                      <TimestampLink
                        seconds={item.startTimeSeconds}
                        label={item.timecodeLabel ?? undefined}
                        openDetailsId="full-transcript"
                        scrollTargetId="full-transcript"
                        offsetModel={offsetModel}
                        className="shrink-0 text-xs text-blue-500 dark:text-blue-400 hover:underline mt-0.5"
                      />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : meeting.topicSummaries.length > 0 ? (
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
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{topic.title}</h3>
                    <TimestampLink
                      seconds={topic.startTime}
                      openDetailsId="full-transcript"
                      scrollTargetId="full-transcript"
                      offsetModel={offsetModel}
                    />
                  </div>
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
                  <a
                    href="#reference"
                    className="inline-block mt-2 text-xs text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    View documents &amp; minutes ↓
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-2xl">
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We haven&apos;t generated a summary for this meeting yet.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <a
                href={`mailto:${SUMMARY_REQUEST_EMAIL}?subject=${encodeURIComponent(
                  `Summary request: ${meeting.title}`,
                )}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                Request this summary →
              </a>
              <SubscribeForm
                kind="CITY_UPDATES"
                cityId={meeting.city.id}
                cityName={meeting.city.name}
                compact
                className="flex-1"
              />
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Full transcript: kept as a reference, not the first thing
              people read. Collapsed by default — "the transcript is
              good proof of what happened, but no one is going to read
              the whole thing." */}
          <details id="full-transcript" className="lg:col-span-1 group">
            <summary className="cursor-pointer text-2xl font-semibold mb-4 list-none flex items-center gap-2">
              <span aria-hidden="true" className="text-base text-gray-400 group-open:rotate-90 transition-transform inline-block">▶</span>
              Full Transcript
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(reference)</span>
            </summary>
            <TranscriptViewer groupedLines={groupedLines} offsetModel={offsetModel} />
          </details>

          {/* Video */}
          {videoId && (
            <section className="lg:col-span-1 min-w-0">
              <h2 id="video" className="text-2xl font-semibold mb-4">Video</h2>
              <YouTubePlayer videoId={videoId} />
            </section>
          )}

          {/* Minutes & Documents */}
          <section id="reference" className="lg:col-span-1">
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
                            segments={meeting.segments}
                            offsetModel={offsetModel}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(meeting.speakerSummaries.length > 0
                  ? [
                      {
                        label: "Council Members & Votes",
                        description:
                          "Who spoke, what they proposed or voted on, and where they stood on each topic.",
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

      <AIDisclaimer />
    </main>
  );
}
