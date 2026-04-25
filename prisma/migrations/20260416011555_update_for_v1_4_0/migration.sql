/*
  Warnings:

  - You are about to drop the column `isSkipped` on the `MeetingSegment` table. All the data in the column will be lost.
  - You are about to drop the column `isSkipped` on the `MinutesItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "logline" TEXT,
ADD COLUMN     "structuredActionItems" JSONB,
ADD COLUMN     "structuredKeyDecisions" JSONB,
ADD COLUMN     "structuredPublicComments" JSONB,
ADD COLUMN     "timelineBullets" JSONB;

-- AlterTable
ALTER TABLE "MeetingSegment" DROP COLUMN "isSkipped",
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "skip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skipReason" VARCHAR(100),
ADD COLUMN     "sourceAgendaAvailable" BOOLEAN,
ADD COLUMN     "sourceMinutesAvailable" BOOLEAN;

-- AlterTable
ALTER TABLE "MinutesItem" DROP COLUMN "isSkipped",
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "endTimecode" VARCHAR(20),
ADD COLUMN     "skip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTimecode" VARCHAR(20);

-- CreateTable
CREATE TABLE "TopicSummary" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "topicId" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "summaryText" TEXT,
    "keyPoints" JSONB,
    "speakers" JSONB,
    "speakerPositions" JSONB,
    "outcome" TEXT,
    "tags" JSONB,
    "provider" VARCHAR(100),
    "model" VARCHAR(200),
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "TopicSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerSummary" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "speakerUuid" VARCHAR(36),
    "speakerName" VARCHAR(200) NOT NULL,
    "segmentCount" INTEGER,
    "speakingTime" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL,
    "summaryText" TEXT,
    "keyQuotes" JSONB,
    "actionsOrMotions" JSONB,
    "positionsByTopic" JSONB,
    "provider" VARCHAR(100),
    "model" VARCHAR(200),
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "SpeakerSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicSummary_meetingId_idx" ON "TopicSummary"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicSummary_meetingId_topicId_key" ON "TopicSummary"("meetingId", "topicId");

-- CreateIndex
CREATE INDEX "SpeakerSummary_meetingId_idx" ON "SpeakerSummary"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerSummary_meetingId_speakerUuid_key" ON "SpeakerSummary"("meetingId", "speakerUuid");

-- AddForeignKey
ALTER TABLE "TopicSummary" ADD CONSTRAINT "TopicSummary_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerSummary" ADD CONSTRAINT "SpeakerSummary_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
