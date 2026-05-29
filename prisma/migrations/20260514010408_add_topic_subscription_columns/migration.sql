-- CreateEnum
CREATE TYPE "SubscriptionKind" AS ENUM ('SITE_UPDATES', 'CITY_COVERAGE_REQUEST', 'CITY_UPDATES', 'TOPIC_IN_CITY_UPDATES', 'TOPIC_IN_CITY_COVERAGE_REQUEST');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "InterestArea" (
    "id" SERIAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "source" VARCHAR(50),
    "statusSummary" TEXT,
    "meetingsDiscussed" INTEGER,
    "totalMeetings" INTEGER,
    "mostRecentActivity" VARCHAR(500),
    "generatedAt" TIMESTAMP(3),
    "runId" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestAreaMeetingStatus" (
    "id" SERIAL NOT NULL,
    "interestAreaId" INTEGER NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "discussed" BOOLEAN NOT NULL,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "runId" VARCHAR(100),

    CONSTRAINT "InterestAreaMeetingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "kind" "SubscriptionKind" NOT NULL,
    "cityId" INTEGER,
    "requestedCityName" VARCHAR(200),
    "interestAreaId" INTEGER,
    "requestedTopicName" VARCHAR(200),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" VARCHAR(64) NOT NULL,
    "unsubscribeToken" VARCHAR(64) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterestArea_cityId_idx" ON "InterestArea"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestArea_cityId_slug_key" ON "InterestArea"("cityId", "slug");

-- CreateIndex
CREATE INDEX "InterestAreaMeetingStatus_meetingId_idx" ON "InterestAreaMeetingStatus"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestAreaMeetingStatus_interestAreaId_meetingId_key" ON "InterestAreaMeetingStatus"("interestAreaId", "meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_confirmToken_key" ON "Subscription"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_unsubscribeToken_key" ON "Subscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Subscription_kind_cityId_interestAreaId_status_idx" ON "Subscription"("kind", "cityId", "interestAreaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriberId_kind_cityId_requestedCityName_int_key" ON "Subscription"("subscriberId", "kind", "cityId", "requestedCityName", "interestAreaId", "requestedTopicName");

-- AddForeignKey
ALTER TABLE "InterestArea" ADD CONSTRAINT "InterestArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAreaMeetingStatus" ADD CONSTRAINT "InterestAreaMeetingStatus_interestAreaId_fkey" FOREIGN KEY ("interestAreaId") REFERENCES "InterestArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAreaMeetingStatus" ADD CONSTRAINT "InterestAreaMeetingStatus_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_interestAreaId_fkey" FOREIGN KEY ("interestAreaId") REFERENCES "InterestArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
