import Link from "next/link";
import { transcriptPath } from "@/app/lib/transcriptPath";
import type { MeetingCandidate } from "@/app/lib/linkRecovery";
import type { CityNavEntry } from "@/app/lib/cityData";

/**
 * "Which meeting did you mean?" for a cut-off transcript link that matches
 * several meetings (FIX-TRUNCATED-LINKS-001). Only catalog data — no Neon.
 */
export default function LinkRecovery({
  prefix,
  matches,
  total,
  cities,
}: {
  prefix: string;
  matches: MeetingCandidate[];
  total: number;
  cities: CityNavEntry[];
}) {
  const cityName = (c: MeetingCandidate) =>
    cities.find((x) => x.stateCode === c.stateCode && x.slug === c.citySlug)?.name ?? c.citySlug;
  const label = (c: MeetingCandidate) => {
    const meeting = c.slug.split("/").slice(1).join("/").replace(/[-_]+/g, " ").trim();
    return meeting ? meeting.charAt(0).toUpperCase() + meeting.slice(1) : c.slug;
  };
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Which meeting did you mean?</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-prose">
        This link looks like it was cut short (video descriptions often shorten long links). These
        meetings start with <code className="text-sm">{prefix}</code>
        {total > matches.length ? ` — showing the ${matches.length} most recent of ${total}` : ""}:
      </p>
      <ul className="space-y-3">
        {matches.map((m) => (
          <li key={m.slug}>
            <Link href={transcriptPath(m.slug)} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {label(m)}
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {" "}
              · {cityName(m)} ·{" "}
              {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
        Not here? <Link href="/" className="underline">Browse meetings by city</Link>.
      </p>
    </main>
  );
}
