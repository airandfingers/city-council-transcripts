-- Baseline migration: these columns already exist on the live (Neon) database
-- and were declared in schema.prisma, but were originally applied via
-- `prisma db push` rather than a committed migration, so migration history
-- never recorded them. This migration reconciles history with reality; it is
-- marked applied via `prisma migrate resolve --applied` on environments where
-- the columns already exist (prod, and any local DB cloned from prod), and
-- runs for real (via `prisma migrate deploy`) on any environment starting
-- from a clean database.

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "meetingReviewed" BOOLEAN,
ADD COLUMN IF NOT EXISTS "meetingReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "meetingReviewedBy" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "transcriptQualityScore" INTEGER,
ADD COLUMN IF NOT EXISTS "transcriptReviewNotes" TEXT,
ADD COLUMN IF NOT EXISTS "transcriptReviewed" BOOLEAN,
ADD COLUMN IF NOT EXISTS "transcriptReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "transcriptReviewedBy" VARCHAR(200);

-- AlterTable
ALTER TABLE "MeetingSummaryItem" ADD COLUMN IF NOT EXISTS "references" JSONB;
