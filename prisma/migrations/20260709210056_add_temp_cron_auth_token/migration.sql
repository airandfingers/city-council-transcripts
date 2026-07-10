-- CreateTable
-- TEMPORARY (2026-07-09): see model comment in schema.prisma. Drop this
-- table once CRON_SECRET is set on Vercel and the GH Actions workflow that
-- relies on it is removed.
CREATE TABLE "CronAuthToken" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "label" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CronAuthToken_token_key" ON "CronAuthToken"("token");
