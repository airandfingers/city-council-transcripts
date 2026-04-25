/*
  Warnings:

  - You are about to drop the column `structuredActionItems` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `structuredKeyDecisions` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `structuredPublicComments` on the `Meeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "structuredActionItems",
DROP COLUMN "structuredKeyDecisions",
DROP COLUMN "structuredPublicComments";

-- AlterTable
ALTER TABLE "MeetingSummaryItem" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "endTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "linkStatus" VARCHAR(20),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "position" VARCHAR(50),
ADD COLUMN     "segmentIndex" INTEGER,
ADD COLUMN     "segmentIndexEnd" INTEGER,
ADD COLUMN     "speaker" VARCHAR(200),
ADD COLUMN     "startTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "timecodeLabel" VARCHAR(50);
