-- AlterTable
ALTER TABLE "InterestAreaMeetingStatus" ADD COLUMN     "endTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "sourceItemId" VARCHAR(100),
ADD COLUMN     "startTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "timecodeLabel" VARCHAR(50);
