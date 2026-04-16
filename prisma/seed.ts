import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { buildMeetingSlug } from "../app/lib/meetingSlug";

type SeedMeeting = {
  stateCode: string;
  citySlug: string;
  title: string;
  date: string;
  summary?: string;
};

type TranscriptFixture = {
  meeting: {
    stateCode: string;
    citySlug: string;
    date: string;
    title: string;
    sourceMeetingKey: string;
  };
  lines: Array<{
    lineIndex: number;
    startTime: number;
    endTime: number;
    speaker: string;
    speakerName: string | null;
    text: string;
    confidence: number;
    globalSpeakerUuid: string | null;
  }>;
};

const prisma = new PrismaClient();

const cities = [
  {
    stateCode: "ca",
    stateName: "California",
    name: "Monterey Park",
    slug: "monterey-park",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    stateCode: "co",
    stateName: "Colorado",
    name: "Fort Collins",
    slug: "fort-collins",
    summary:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit.",
  },
] as const;

const meetings: SeedMeeting[] = [
  {
    stateCode: "ca",
    citySlug: "monterey-park",
    title: "City Council Meeting - Friday, Feb 13, 2026",
    date: "2026-02-13",
    summary:
      "Discussion of annual budget allocations and infrastructure improvements for the downtown area.",
  },
  {
    stateCode: "ca",
    citySlug: "monterey-park",
    title: "City Council Meeting - Monday, Jan 27, 2026",
    date: "2026-01-27",
    summary:
      "Review of community safety initiatives and parks department proposals.",
  },
  {
    stateCode: "co",
    citySlug: "fort-collins",
    title: "City Council Meeting - Friday, Feb 13, 2026",
    date: "2026-02-13",
    summary:
      "Comprehensive planning session for sustainable development and transit expansion.",
  },
];

async function seedCities() {
  for (const city of cities) {
    await prisma.city.upsert({
      where: {
        stateCode_slug: {
          stateCode: city.stateCode,
          slug: city.slug,
        },
      },
      update: {
        stateName: city.stateName,
        name: city.name,
        summary: city.summary,
      },
      create: city,
    });
  }
}

async function seedMeetings() {
  for (const meeting of meetings) {
    const city = await prisma.city.findUniqueOrThrow({
      where: {
        stateCode_slug: {
          stateCode: meeting.stateCode,
          slug: meeting.citySlug,
        },
      },
    });

    const date = new Date(meeting.date);
    const slug = buildMeetingSlug({
      citySlug: meeting.citySlug,
      date,
      title: meeting.title,
    });

    await prisma.meeting.upsert({
      where: { slug },
      update: {
        cityId: city.id,
        date,
        title: meeting.title,
        summary: meeting.summary ?? null,
      },
      create: {
        cityId: city.id,
        slug,
        date,
        title: meeting.title,
        summary: meeting.summary ?? null,
      },
    });
  }
}

async function seedTranscriptLines() {
  const fixturePath = new URL("./fixtures/transcript-lines.tiny.json", import.meta.url);
  const fixtureRaw = await readFile(fixturePath, "utf-8");
  const fixture = JSON.parse(fixtureRaw) as TranscriptFixture;

  const meetingSlug = buildMeetingSlug({
    citySlug: fixture.meeting.citySlug,
    date: fixture.meeting.date,
    title: fixture.meeting.title,
  });

  const meeting = await prisma.meeting.findUnique({
    where: { slug: meetingSlug },
  });

  if (!meeting) {
    throw new Error(`Fixture meeting not found for slug: ${meetingSlug}`);
  }

  await prisma.transcriptLine.deleteMany({
    where: { meetingId: meeting.id },
  });

  await prisma.transcriptLine.createMany({
    data: fixture.lines.map((line) => ({
      meetingId: meeting.id,
      lineIndex: line.lineIndex,
      startTime: line.startTime,
      endTime: line.endTime,
      speaker: line.speaker,
      speakerName: line.speakerName,
      text: line.text,
      confidence: line.confidence,
      globalSpeakerUuid: line.globalSpeakerUuid,
    })),
  });
}

async function main() {
  await seedCities();
  // await seedMeetings();
  // await seedTranscriptLines();

  const cityCount = await prisma.city.count();
  const meetingCount = await prisma.meeting.count();
  const lineCount = await prisma.transcriptLine.count();

  console.log(`Seed complete: ${cityCount} cities, ${meetingCount} meetings, ${lineCount} transcript lines.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
