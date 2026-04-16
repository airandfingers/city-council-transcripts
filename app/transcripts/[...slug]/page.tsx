import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/app/lib/prisma";
import TopicsPanel from "@/app/components/TopicsPanel";
import type { Topic } from "@/app/components/TopicsPanel";
import DocumentsPanel from "@/app/components/DocumentsPanel";
import VideoSyncProvider from "@/app/components/VideoSyncProvider";
import YouTubePlayer from "@/app/components/YouTubePlayer";
import TranscriptViewer from "@/app/components/TranscriptViewer";
import EditableTitle from "@/app/components/EditableTitle";
import type { GroupedLine } from "@/app/lib/transcript";

const SUMMARY_TYPE_LABELS: Record<string, string> = {
  KEY_DECISION: "Key Decisions",
  ACTION_ITEM: "Action Items",
  MOTION_AND_VOTE: "Motions & Votes",
  PUBLIC_COMMENT_SUMMARY: "Public Comments",
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
  const topicMap = new Map<string, string[]>();
  for (const item of meeting.summaryItems) {
    const list = topicMap.get(item.type) ?? [];
    list.push(item.text);
    topicMap.set(item.type, list);
  }
  const topics: Topic[] = Array.from(topicMap.entries()).map(([type, bullets]) => ({
    label: SUMMARY_TYPE_LABELS[type] ?? type,
    bullets,
  }));

  const videoId = meeting.youtubeUrl
    ? extractYouTubeId(meeting.youtubeUrl)
    : null;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <section className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Summary</h2>
          {meeting.summary ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {meeting.summary}
              </p>
              {meeting.summaryModel && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  Generated by {meeting.summaryModel}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No summary available for this meeting yet.
            </p>
          )}
        </section>

        <section className="p-6">
          <TopicsPanel topics={topics} heading="" />
        </section>
      </div>

      <VideoSyncProvider>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transcript */}
          <TranscriptViewer groupedLines={groupedLines} />

          {/* Video */}
          {videoId && (
            <section className="lg:col-span-1 min-w-0">
              <h2 className="text-2xl font-semibold mb-4">Video</h2>
              <YouTubePlayer videoId={videoId} />
            </section>
          )}

          {/* Minutes & Documents */}
          <section className="lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Reference</h2>
            <DocumentsPanel
              minutesText={meeting.minutesText}
              minutesUrl={meeting.minutesUrl}
              documents={meeting.documents}
            />
          </section>
        </div>
      </VideoSyncProvider>
    </main>
  );
}
