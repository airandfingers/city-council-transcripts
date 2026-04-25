-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "minutesAlignedCount" INTEGER,
ADD COLUMN     "minutesGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "minutesTotalItems" INTEGER;

-- CreateTable
CREATE TABLE "MeetingSegment" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "itemId" VARCHAR(100) NOT NULL,
    "itemNumber" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "discussionSummary" TEXT,
    "officialAction" TEXT,
    "tags" JSONB,
    "speakerPositions" JSONB,
    "keyQuotes" JSONB,
    "publicComments" JSONB,
    "discrepancies" JSONB,
    "sourcesUsed" JSONB,
    "provider" VARCHAR(100),
    "model" VARCHAR(200),
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinutesItem" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "itemId" VARCHAR(100) NOT NULL,
    "itemNumber" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "parentItemId" VARCHAR(100),
    "itemType" VARCHAR(50) NOT NULL,
    "alignmentConfidence" VARCHAR(20),
    "alignmentMethod" VARCHAR(100),
    "agendaItemId" VARCHAR(50),
    "textLineStart" INTEGER,
    "textLineEnd" INTEGER,
    "segmentIndices" JSONB,

    CONSTRAINT "MinutesItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingSegment_meetingId_idx" ON "MeetingSegment"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSegment_meetingId_itemId_key" ON "MeetingSegment"("meetingId", "itemId");

-- CreateIndex
CREATE INDEX "MinutesItem_meetingId_idx" ON "MinutesItem"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MinutesItem_meetingId_itemId_key" ON "MinutesItem"("meetingId", "itemId");

-- AddForeignKey
ALTER TABLE "MeetingSegment" ADD CONSTRAINT "MeetingSegment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinutesItem" ADD CONSTRAINT "MinutesItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
