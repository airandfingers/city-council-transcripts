-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MEETING_UPDATED', 'INTEREST_AREA_UPDATED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('DRAFTED', 'SENT_TO_ADMINS', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "type" "AlertType" NOT NULL,
    "meetingId" INTEGER,
    "interestAreaId" INTEGER,
    "status" "AlertStatus" NOT NULL DEFAULT 'DRAFTED',
    "content" JSONB NOT NULL,
    "sentToAdminsAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" VARCHAR(320),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_type_status_idx" ON "Alert"("type", "status");

-- CreateIndex
CREATE INDEX "Alert_meetingId_idx" ON "Alert"("meetingId");

-- CreateIndex
CREATE INDEX "Alert_interestAreaId_idx" ON "Alert"("interestAreaId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_interestAreaId_fkey" FOREIGN KEY ("interestAreaId") REFERENCES "InterestArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
