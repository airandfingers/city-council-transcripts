-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'OCCURRED', 'PUBLISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InterestAreaStatusPhase" AS ENUM ('PREVIEW', 'POSTMEETING');

-- DropIndex
DROP INDEX "InterestAreaMeetingStatus_interestAreaId_meetingId_key";

-- AlterTable
ALTER TABLE "InterestAreaMeetingStatus" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discussionExpected" BOOLEAN,
ADD COLUMN     "phase" "InterestAreaStatusPhase" NOT NULL DEFAULT 'POSTMEETING',
ADD COLUMN     "signalStrength" VARCHAR(10),
ALTER COLUMN "discussed" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "agendaLastFetchedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MeetingStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "AgendaItemVersion" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "sourceItemId" VARCHAR(100) NOT NULL,
    "itemNumber" VARCHAR(50),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentUrls" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaItemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaItemVersion_meetingId_sourceItemId_idx" ON "AgendaItemVersion"("meetingId", "sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaItemVersion_meetingId_sourceItemId_revision_key" ON "AgendaItemVersion"("meetingId", "sourceItemId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "InterestAreaMeetingStatus_interestAreaId_meetingId_phase_key" ON "InterestAreaMeetingStatus"("interestAreaId", "meetingId", "phase");

-- AddForeignKey
ALTER TABLE "AgendaItemVersion" ADD CONSTRAINT "AgendaItemVersion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

