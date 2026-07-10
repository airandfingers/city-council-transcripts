-- AlterEnum
ALTER TYPE "AlertStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledBy" VARCHAR(320);

-- CreateIndex
CREATE INDEX "Alert_status_scheduledFor_idx" ON "Alert"("status", "scheduledFor");
