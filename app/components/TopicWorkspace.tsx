"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import CopyTimecode from "@/app/components/CopyTimecode";
import TopicVideoPanel, { type TopicMoment } from "@/app/components/TopicVideoPanel";
import type {
  TopicDetailMeeting,
  TopicRelated,
} from "@/app/lib/cityData";
import {
  KIND_FACET_LABEL,
  KIND_LABEL,
  type TopicMeetingKind,
  type TopicPublicComment,
  type TopicSpeaker,
  type TopicStance,
} from "@/app/lib/topicDetail";
import { formatMeetingDate } from "@/app/lib/formatDate";
import { buildTranscriptTimestampUrl, formatSeconds } from "@/app/lib/videoSeek";

/** Meetings shown before the "earlier meetings" disclosure kicks in. */
const VISIBLE_MEETINGS = 6;

const STANCE_BAR: Record<TopicStance, string> = {
  support: "bg-sky-400 dark:bg-sky-500",
  concern: "bg-rose-400 dark:bg-rose-500",
  neutral: "bg-gray-300 dark:bg-gray-600",
  mixed: "bg-gradient-to-r from-sky-400 to-rose-400",
};

const STANCE_LABEL: Record<TopicStance, string> = {
  support: "Spoke in support",
  concern: "Raised concerns",
  neutral: "Neutral / procedural",
  mixed: "Mixed across meetings",
};

type Props = {
  meetings: TopicDetailMeeting[];
  speakers: TopicSpeaker[];
  publicComments: TopicPublicComment[];
  related: TopicRelated[];
  cityHref: string;
  /** Rendered at the top of the reading column — the topic summary and
   *  "where it stands today", which lead the page on every viewport. */
  summarySlot: ReactNode;
  /** Rendered under the rail (and so below the feed on mobile). */
  followSlot: ReactNode;
};

/**
 * The topic page body: a single scrolling column of meeting cards with a
 * reference rail beside it (wireframe direction 4, "Stacked Cards").
 *
 * One client component rather than several because the two halves share
 * state — clicking a timecode in a card plays that moment in the rail's
 * video slot — and because the filter row, the "earlier meetings"
 * disclosure and the rail's tabs are all local UI state with nothing to
 * persist.
 *
 * Emptiness is the rule, not the exception, in this data: most topics
 * have no linked topic summary, so no voices, no outcome and no public
 * comment. Every section here hides itself when it has nothing to say
 * (the wireframes' edge-state sheet: "tabs are dynamic"), which is why
 * the tab list is built rather than declared.
 */
export default function TopicWorkspace({
  meetings,
  speakers,
  publicComments,
  related,
  cityHref,
  summarySlot,
  followSlot,
}: Props) {
  const [moment, setMoment] = useState<TopicMoment | null>(null);
  const [filter, setFilter] = useState<TopicMeetingKind | "all">("all");
  const [expanded, setExpanded] = useState(false);

  const facets = useMemo(() => {
    const kinds: TopicMeetingKind[] = ["decision", "public", "discussion"];
    return kinds
      .map((kind) => ({
        kind,
        count: meetings.filter((m) => m.kinds.includes(kind)).length,
      }))
      .filter((f) => f.count > 0);
  }, [meetings]);

  const filtered = filter === "all" ? meetings : meetings.filter((m) => m.kinds.includes(filter));
  const visible = expanded ? filtered : filtered.slice(0, VISIBLE_MEETINGS);
  const hidden = filtered.length - visible.length;

  const tabs: { label: string; content: ReactNode }[] = [];
  if (speakers.length > 0) {
    tabs.push({ label: `Voices · ${speakers.length}`, content: <VoicesTab speakers={speakers} /> });
  }
  if (publicComments.length > 0) {
    tabs.push({
      label: `Public · ${publicComments.length}`,
      content: <PublicTab comments={publicComments} meetings={meetings} onPlay={setMoment} />,
    });
  }
  if (related.length > 0) {
    tabs.push({ label: "Related", content: <RelatedTab related={related} cityHref={cityHref} /> });
  }

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      {/* ── Reading column ── */}
      <div className="min-w-0 flex-1">
        {summarySlot}

        {/* The rail sits below the feed on mobile, so a selected moment
            gets its own player here instead of scrolling the reader past
            every card to find it. */}
        {moment && (
          <div className="lg:hidden mb-5">
            <TopicVideoPanel moment={moment} />
          </div>
        )}

        {facets.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterPill
              label={`All · ${meetings.length}`}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {facets.map((f) => (
              <FilterPill
                key={f.kind}
                label={`${KIND_FACET_LABEL[f.kind]} · ${f.count}`}
                active={filter === f.kind}
                onClick={() => setFilter(f.kind)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            No meeting history recorded yet for this topic.
          </p>
        ) : (
          <ol className="space-y-3">
            {visible.map((m) => (
              <li key={m.meetingId}>
                <MeetingCard meeting={m} onPlay={setMoment} />
              </li>
            ))}
          </ol>
        )}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="cursor-pointer w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ▾ {hidden} earlier meeting{hidden === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {/* ── Reference rail ── */}
      <aside className="mt-8 lg:mt-0 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6 lg:border-l lg:border-gray-200 lg:dark:border-gray-800 lg:pl-8">
        <div className="hidden lg:block">
          <TopicVideoPanel moment={moment} />
        </div>

        {tabs.length > 0 && <RailTabs tabs={tabs} />}

        <div className="mt-6">{followSlot}</div>
      </aside>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
          : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
      }`}
    >
      {label}
    </button>
  );
}

function MeetingCard({
  meeting,
  onPlay,
}: {
  meeting: TopicDetailMeeting;
  onPlay: (moment: TopicMoment) => void;
}) {
  const transcriptHref =
    meeting.startTimeSeconds != null
      ? buildTranscriptTimestampUrl(meeting.slug, meeting.startTimeSeconds)
      : `/transcripts/${meeting.slug}`;

  return (
    <article className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-sm leading-snug">
          <Link href={transcriptHref} className="hover:underline">
            {meeting.title}
          </Link>
        </h3>
        <time className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatMeetingDate(meeting.date)}
        </time>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {meeting.kinds.map((kind) => (
          <span
            key={kind}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium border ${
              kind === "decision"
                ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {KIND_LABEL[kind]}
          </span>
        ))}
      </div>

      {meeting.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2.5">
          {meeting.summary}
        </p>
      )}

      {meeting.outcome && (
        <div className="mt-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            What council did
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{meeting.outcome}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {meeting.startTimeSeconds != null &&
          (meeting.video ? (
            <TimecodeChip
              label={meeting.timecodeLabel?.trim() || formatSeconds(meeting.startTimeSeconds)}
              onClick={() =>
                onPlay({
                  videoUrl: meeting.video!.url,
                  videoProvider: meeting.video!.provider,
                  seconds: meeting.startTimeSeconds!,
                  videoSeconds: meeting.videoSeconds,
                  label: meeting.timecodeLabel,
                  meetingSlug: meeting.slug,
                  meetingTitle: meeting.title,
                  meetingDate: meeting.date,
                })
              }
            />
          ) : (
            <CopyTimecode
              seconds={meeting.startTimeSeconds}
              label={meeting.timecodeLabel?.trim() || undefined}
            />
          ))}

        {meeting.speakers.slice(0, 4).map((s) => (
          <span
            key={s.name}
            title={STANCE_LABEL[s.stance]}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STANCE_BAR[s.stance]}`} />
            {s.name}
          </span>
        ))}
        {meeting.speakers.length > 4 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            +{meeting.speakers.length - 4} more
          </span>
        )}

        <Link
          href={transcriptHref}
          className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          Read transcript →
        </Link>
      </div>
    </article>
  );
}

function TimecodeChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Play this moment"
      className="cursor-pointer inline-flex items-center gap-1 rounded border border-blue-500/60 bg-blue-500/5 px-1.5 py-0.5 font-mono text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
    >
      <span aria-hidden>▸</span>
      {label}
    </button>
  );
}

function RailTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="mt-6">
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={`cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors ${
              i === active
                ? "border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3">{current.content}</div>
    </div>
  );
}

/** Voices shown before the rail's own "show all" disclosure. A busy topic
 *  can name dozens of people; the rail is a reference column, not a list. */
const VISIBLE_VOICES = 8;

function VoicesTab({ speakers }: { speakers: TopicSpeaker[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? speakers : speakers.slice(0, VISIBLE_VOICES);

  return (
    <>
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {visible.map((s) => (
        <li key={s.name} className="flex items-center gap-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-200">
            {initials(s.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{s.name}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {s.meetingCount} meeting{s.meetingCount === 1 ? "" : "s"}
            </span>
          </span>
          <span
            title={STANCE_LABEL[s.stance]}
            className={`h-1.5 w-6 shrink-0 rounded-full ${STANCE_BAR[s.stance]}`}
          />
        </li>
      ))}
    </ul>
    {speakers.length > visible.length && (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="cursor-pointer w-full pt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        ▾ {speakers.length - visible.length} more
      </button>
    )}
    </>
  );
}

function PublicTab({
  comments,
  meetings,
  onPlay,
}: {
  comments: TopicPublicComment[];
  meetings: TopicDetailMeeting[];
  onPlay: (moment: TopicMoment) => void;
}) {
  const videoBySlug = new Map(meetings.map((m) => [m.slug, m]));

  return (
    <ul className="space-y-3">
      {comments.map((c, i) => {
        const meeting = videoBySlug.get(c.meetingSlug);
        return (
          <li key={`${c.meetingSlug}-${i}`} className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium truncate">{c.speaker}</span>
              <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatMeetingDate(c.meetingDate, { month: "short", day: "numeric", year: "2-digit" })}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-1">{c.text}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`h-1.5 w-6 rounded-full ${STANCE_BAR[c.stance]}`} title={STANCE_LABEL[c.stance]} />
              {c.seconds != null && meeting?.video && (
                <TimecodeChip
                  label={formatSeconds(c.seconds)}
                  onClick={() =>
                    onPlay({
                      videoUrl: meeting.video!.url,
                      videoProvider: meeting.video!.provider,
                      seconds: c.seconds!,
                      videoSeconds: c.videoSeconds,
                      label: null,
                      meetingSlug: meeting.slug,
                      meetingTitle: meeting.title,
                      meetingDate: meeting.date,
                    })
                  }
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RelatedTab({ related, cityHref }: { related: TopicRelated[]; cityHref: string }) {
  return (
    <ul className="space-y-1">
      {related.map((r) => (
        <li key={r.slug}>
          <Link
            href={`${cityHref}/topics/${r.slug}`}
            className="flex items-baseline justify-between gap-2 rounded px-2 py-1.5 -mx-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="truncate">{r.name}</span>
            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              {r.meetingsDiscussed}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function initials(name: string): string {
  // Names routinely carry a trailing role ("Anne (Council Member)"), whose
  // bracket would otherwise become one of the two initials.
  return name
    .replace(/\(.*?\)/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
