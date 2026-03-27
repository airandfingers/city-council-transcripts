import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TranscriptPage({ params }: Props) {
  const { slug } = await params;

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

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold mb-4">Transcript</h2>
        {meeting.lines.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No transcript lines are available for this meeting yet.
          </p>
        ) : (
          meeting.lines.map((line) => (
            <article
              key={line.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span className="font-medium">
                  {line.speakerName ?? line.speaker}
                </span>
                <span className="mx-2">•</span>
                <span>
                  {line.startTime.toFixed(2)}s - {line.endTime.toFixed(2)}s
                </span>
              </div>
              <p className="text-gray-900 dark:text-gray-100">{line.text}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
