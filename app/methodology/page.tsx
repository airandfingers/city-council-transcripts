import type { Metadata } from "next";
import Link from "next/link";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const metadata: Metadata = {
  title: "How we make this",
  description:
    "How meeting recordings become transcripts, summaries, topic tracking and short videos — and where each step can go wrong.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 dark:text-gray-300 max-w-prose">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link href="/" className="hover:underline">
          Cities
        </Link>
        {" / How we make this"}
      </nav>

      <h1 className="text-3xl font-bold mb-2">How we make this</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-10 max-w-prose">
        Everything on this site starts from the public recording of a city meeting. This page
        explains each step from recording to transcript, summary, topic tracking and short
        video, and where each step can go wrong, so you can judge how much to rely on it.
      </p>

      <Section id="recordings" title="1. Recordings">
        <p>
          We download the official recording the city publishes (on its own video archive or its
          YouTube channel), along with the agenda, minutes and other meeting documents when the
          city posts them. Every meeting page links back to the city&apos;s originals.
        </p>
      </Section>

      <Section id="transcripts" title="2. Transcripts">
        <p>
          Speech is transcribed by an open-source speech-recognition model (Whisper), run on our
          own hardware. A second model separates the different voices, and we match voices to the
          city&apos;s roster of officials where we can.
        </p>
        <p>
          <strong>Where it goes wrong:</strong> misheard words (especially names and street
          names), and speakers that are mislabeled or left as &ldquo;Speaker 3&rdquo;. Speaker
          names are the least reliable part. A transcript marked as not yet reviewed has had no
          human check.
        </p>
      </Section>

      <Section id="summaries" title="3. Summaries">
        <p>
          Summaries are written by an AI language model running locally. The model reads the{" "}
          <em>whole</em> transcript in sections (nothing is cut off to fit) and, where available,
          the official minutes and agenda. Key points link to the moment in the recording they
          come from, so you can check them.
        </p>
        <p>
          <strong>Where it goes wrong:</strong> the model can misstate who said what, overstate how
          settled something is, or miss context that only the room had. When the summary and the
          recording disagree, the recording is right.
        </p>
      </Section>

      <Section id="topics" title="4. Topics and ongoing issues">
        <p>
          Each city has a list of topics residents follow, from broad areas like housing or
          budgets to specific, long-running matters. After each meeting, the AI checks
          whether each topic came up and summarizes what happened, so a topic page shows how an
          issue moved across meetings.
        </p>
      </Section>

      <Section id="videos" title="5. Short videos">
        <p>
          We publish short cuts of meetings for people who won&apos;t watch three hours of
          council video. Every cut is <strong>edited for length</strong>, which means it leaves
          things out. To keep that honest:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Every video opens with a card naming the meeting and date and saying it&apos;s edited,
            and ends by pointing to the full meeting.
          </li>
          <li>
            Each clip shows a timecode for where it happens in the full meeting, and the
            description links to that exact moment in the transcript.
          </li>
          <li>Clips play in the order they happened. We don&apos;t rearrange the meeting.</li>
          <li>
            <strong>Previews</strong> (under a minute) show the issue that was raised, such as a
            resident&apos;s story or the point of disagreement, and say so. What happened next is
            in the full meeting, linked from the video.
          </li>
          <li>
            Clips are either proposed by AI and reviewed by a person before publishing, or chosen
            and edited by a person. Each video&apos;s description says which.
          </li>
          <li>
            Video descriptions describe people by role (&ldquo;a resident&rdquo;, &ldquo;a
            councilmember&rdquo;) rather than guessing names.
          </li>
          <li>
            Audio is level-matched so quiet and loud speakers are both audible. Nothing else
            about the audio or picture is altered.
          </li>
        </ul>
      </Section>

      <Section id="corrections" title="Corrections">
        <p>
          If something here is wrong, tell us in the comments on the video. Corrections fix the
          transcript or summary at its source, and the change is noted where it matters.
        </p>
      </Section>

      <AIDisclaimer />
    </main>
  );
}
