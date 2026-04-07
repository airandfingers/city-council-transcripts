import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/app/lib/prisma";
import TopicsPanel from "@/app/components/TopicsPanel";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

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
    },
  });

  if (!meeting) {
    notFound();
  }

  // Format seconds as HH:MM:SS with leading zeros stripped from the hours
  // portion, e.g. 0:00, 4:03, 1:04:03
  function formatTimestamp(totalSeconds: number): string {
    const rounded = Math.round(totalSeconds);
    const h = Math.floor(rounded / 3600);
    const m = Math.floor((rounded % 3600) / 60);
    const s = rounded % 60;
    const ss = String(s).padStart(2, "0");
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${ss}`;
    }
    return `${m}:${ss}`;
  }

  // Display "Unknown Speaker" for raw speaker IDs
  function displayName(speakerName: string | null, speaker: string): string {
    const name = speakerName ?? speaker;
    return /^(speaker_|known_)/i.test(name) ? "Unknown Speaker" : name;
  }

  // Group consecutive lines by the same speaker.
  // Use a double newline as separator when there is a gap of 2.5 s+.
  const groupedLines = meeting.lines.reduce<
    {
      speaker: string;
      speakerName: string | null;
      startTime: number;
      endTime: number;
      text: string;
      firstId: number;
    }[]
  >((groups, line) => {
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

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link
          href={`/${meeting.city.stateCode}/${meeting.city.slug}`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to {meeting.city.name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {meeting.city.name}, {meeting.city.stateName}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Summary</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum. Curabitur
            pretium tincidunt lacus, nec porta arcu aliquam vel.
          </p>
        </section>

        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <TopicsPanel />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transcript */}
        <section className="lg:col-span-1 flex flex-col max-h-[800px]">
          <h2 className="text-2xl font-semibold mb-4 shrink-0">Transcript</h2>
          <div className="overflow-y-auto space-y-3 pr-2">
            {groupedLines.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No transcript lines are available for this meeting yet.
              </p>
            ) : (
              groupedLines.map((group) => (
                <article
                  key={group.firstId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="font-medium">
                      {displayName(group.speakerName, group.speaker)}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      {formatTimestamp(group.startTime)} -{" "}
                      {formatTimestamp(group.endTime)}
                    </span>
                  </div>
                  <div className="text-gray-900 dark:text-gray-100 space-y-3">
                    {group.text.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Video */}
        <section className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Video</h2>
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-lg"
              src="https://www.youtube.com/embed/15ZjzwOeDdg?list=RD15ZjzwOeDdg"
              title="Meeting Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        {/* Agenda */}
        <section className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Agenda</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.</li>
            <li>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.</li>
            <li>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.</li>
            <li>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia.</li>
            <li>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.</li>
            <li>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.</li>
            <li>Neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur.</li>
            <li>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam.</li>
            <li>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.</li>
            <li>Nam libero tempore cum soluta nobis est eligendi optio cumque nihil impedit.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
