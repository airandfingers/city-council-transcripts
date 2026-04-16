-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "stateCode" VARCHAR(2) NOT NULL,
    "stateName" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" SERIAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "summaryModel" VARCHAR(200),
    "youtubeUrl" VARCHAR(500),
    "granicusUrl" VARCHAR(500),
    "minutesText" TEXT,
    "minutesUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptLine" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "speaker" VARCHAR(200) NOT NULL,
    "speakerName" VARCHAR(200),
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "globalSpeakerUuid" VARCHAR(36),

    CONSTRAINT "TranscriptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSummaryItem" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "MeetingSummaryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingDocument" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "documentType" VARCHAR(100),
    "associatedAgendaItem" TEXT,

    CONSTRAINT "MeetingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_stateCode_idx" ON "City"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateCode_slug_key" ON "City"("stateCode", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_slug_key" ON "Meeting"("slug");

-- CreateIndex
CREATE INDEX "Meeting_cityId_idx" ON "Meeting"("cityId");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "Meeting"("date");

-- CreateIndex
CREATE INDEX "TranscriptLine_meetingId_idx" ON "TranscriptLine"("meetingId");

-- CreateIndex
CREATE INDEX "TranscriptLine_globalSpeakerUuid_idx" ON "TranscriptLine"("globalSpeakerUuid");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptLine_meetingId_lineIndex_key" ON "TranscriptLine"("meetingId", "lineIndex");

-- CreateIndex
CREATE INDEX "MeetingSummaryItem_meetingId_idx" ON "MeetingSummaryItem"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSummaryItem_meetingId_type_sortOrder_key" ON "MeetingSummaryItem"("meetingId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingDocument_meetingId_idx" ON "MeetingDocument"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingDocument_meetingId_url_key" ON "MeetingDocument"("meetingId", "url");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptLine" ADD CONSTRAINT "TranscriptLine_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSummaryItem" ADD CONSTRAINT "MeetingSummaryItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDocument" ADD CONSTRAINT "MeetingDocument_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
