/**
 * Meeting content that is loaded only when a reader asks for it: the full
 * transcript (FIX-TRANSCRIPT-LAZY-LOAD-001) and the hidden tabs
 * (FIX-MEETING-TABS-LAZY-001).
 *
 * Why: Vercel meters every ISR cache read in 8 KB units, and a meeting page
 * carried its whole transcript twice (as HTML and again as React's hydration
 * data) on every view, ~300 KB of a ~465 KB page, although the transcript
 * sits collapsed and few readers open it. Server-rendering doesn't avoid the
 * second copy: Next.js serializes server output into the page data too. So
 * the text moved to its own cached URLs, read only when opened.
 *
 * Both readers are uncached by Data Cache on purpose: they back ISR-cached
 * routes (`revalidate = false`), which /api/revalidate purges along with the
 * meeting page (see meetingContentPaths), and the publisher re-warms them
 * inside the Neon sync window.
 */
import prisma from "@/app/lib/prisma";
import { isKnownMeeting } from "@/app/lib/cityData";
import { buildTitleByUuid, speakerLabel, type RosterMemberRow } from "@/app/lib/roster";
import { displayName, type GroupedLine, type TranscriptTurn } from "@/app/lib/transcript";
import { formatMeetingDate } from "@/app/lib/formatDate";

async function titleByUuidFor(cityId: number, meetingDate: Date): Promise<Record<string, string>> {
  const rosterMembers = await prisma.rosterMember.findMany({
    where: { cityId },
    select: { globalSpeakerUuid: true, name: true, titles: true },
  });
  return Object.fromEntries(
    buildTitleByUuid(
      rosterMembers.map((m) => ({
        globalSpeakerUuid: m.globalSpeakerUuid,
        name: m.name,
        titles: m.titles as RosterMemberRow["titles"],
      })),
      meetingDate,
    ),
  );
}

/** Groups consecutive lines by the same speaker; a gap of 2.5 s or more
 * inside a turn starts a new paragraph ("\n\n"). */
export function groupTranscriptLines(
  lines: Array<{
    id: number;
    speaker: string;
    speakerName: string | null;
    globalSpeakerUuid: string | null;
    startTime: number;
    endTime: number;
    text: string;
  }>,
): GroupedLine[] {
  return lines.reduce<GroupedLine[]>((groups, line) => {
    const prev = groups[groups.length - 1];
    if (prev && (prev.speakerName ?? prev.speaker) === (line.speakerName ?? line.speaker)) {
      const gap = line.startTime - prev.endTime;
      prev.text += (gap >= 2.5 ? "\n\n" : " ") + line.text;
      prev.endTime = line.endTime;
    } else {
      groups.push({
        speaker: line.speaker,
        speakerName: line.speakerName,
        globalSpeakerUuid: line.globalSpeakerUuid,
        startTime: line.startTime,
        endTime: line.endTime,
        text: line.text,
        firstId: line.id,
      });
    }
    return groups;
  }, []);
}

export type TranscriptRecord = {
  slug: string;
  title: string;
  dateLabel: string;
  cityName: string;
  stateCode: string;
  citySlug: string;
  turns: TranscriptTurn[];
};

/** The meeting's transcript turns with speaker labels resolved (roster title
 * as of the meeting date), or null for an unknown meeting. */
export async function getTranscriptRecord(slug: string): Promise<TranscriptRecord | null> {
  if (!(await isKnownMeeting(slug))) return null;
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      date: true,
      cityId: true,
      city: { select: { name: true, stateCode: true, slug: true } },
      lines: {
        orderBy: { lineIndex: "asc" },
        select: {
          id: true,
          speaker: true,
          speakerName: true,
          globalSpeakerUuid: true,
          startTime: true,
          endTime: true,
          text: true,
        },
      },
    },
  });
  if (!meeting) return null;
  const titleByUuid = await titleByUuidFor(meeting.cityId, meeting.date);
  return {
    slug: meeting.slug,
    title: meeting.title,
    dateLabel: formatMeetingDate(meeting.date),
    cityName: meeting.city.name,
    stateCode: meeting.city.stateCode,
    citySlug: meeting.city.slug,
    turns: groupTranscriptLines(meeting.lines).map((group) => ({
      label: speakerLabel(
        displayName(group.speakerName, group.speaker),
        group.globalSpeakerUuid ? (titleByUuid[group.globalSpeakerUuid] ?? null) : null,
      ),
      startTime: group.startTime,
      endTime: group.endTime,
      text: group.text,
      firstId: group.firstId,
    })),
  };
}

/** Everything the meeting page's hidden tabs show. JSON-safe (no Dates). */
export async function getMeetingTabs(slug: string) {
  if (!(await isKnownMeeting(slug))) return null;
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    select: {
      date: true,
      cityId: true,
      minutesText: true,
      segments: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          itemNumber: true,
          title: true,
          startTime: true,
          endTime: true,
          durationSeconds: true,
          skip: true,
          skipReason: true,
          discussionSummary: true,
          officialAction: true,
          tags: true,
          speakerPositions: true,
          keyQuotes: true,
          publicComments: true,
        },
      },
      speakerSummaries: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          speakerUuid: true,
          speakerName: true,
          speakingTime: true,
          summaryText: true,
          keyQuotes: true,
          actionsOrMotions: true,
          positionsByTopic: true,
        },
      },
    },
  });
  if (!meeting) return null;
  return {
    minutesText: meeting.minutesText,
    segments: meeting.segments,
    speakerSummaries: meeting.speakerSummaries,
    titleByUuid:
      meeting.speakerSummaries.length > 0 ? await titleByUuidFor(meeting.cityId, meeting.date) : {},
  };
}

export type MeetingTabs = NonNullable<Awaited<ReturnType<typeof getMeetingTabs>>>;
