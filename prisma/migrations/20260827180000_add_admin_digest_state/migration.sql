-- CreateTable
-- Singleton row (id always 1) tracking cadence for once-a-week sections of
-- the admin digest — see model comment in schema.prisma.
CREATE TABLE "AdminDigestState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "subscriberSummarySentAt" TIMESTAMP(3),

    CONSTRAINT "AdminDigestState_pkey" PRIMARY KEY ("id")
);
