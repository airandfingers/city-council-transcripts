-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "frequency" "AlertFrequency" NOT NULL DEFAULT 'INSTANT';

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" SERIAL NOT NULL,
    "alertId" INTEGER NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "frequency" "AlertFrequency" NOT NULL,
    "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "digestBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestBatch" (
    "id" SERIAL NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "frequency" "AlertFrequency" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertDelivery_subscriptionId_status_frequency_idx" ON "AlertDelivery"("subscriptionId", "status", "frequency");

-- CreateIndex
CREATE INDEX "AlertDelivery_digestBatchId_idx" ON "AlertDelivery"("digestBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_alertId_subscriptionId_key" ON "AlertDelivery"("alertId", "subscriptionId");

-- CreateIndex
CREATE INDEX "DigestBatch_subscriberId_frequency_sentAt_idx" ON "DigestBatch"("subscriberId", "frequency", "sentAt");

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_digestBatchId_fkey" FOREIGN KEY ("digestBatchId") REFERENCES "DigestBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestBatch" ADD CONSTRAINT "DigestBatch_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
