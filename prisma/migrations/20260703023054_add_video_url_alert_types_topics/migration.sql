-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'MEETING_UPCOMING';

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "videoProvider" VARCHAR(50),
ADD COLUMN     "videoUrl" VARCHAR(1000);
