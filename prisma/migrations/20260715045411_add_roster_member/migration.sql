-- CreateTable
CREATE TABLE "RosterMember" (
    "id" SERIAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "memberId" VARCHAR(200) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "globalSpeakerUuid" VARCHAR(36),
    "titles" JSONB NOT NULL,
    "affiliation" VARCHAR(200),
    "district" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RosterMember_cityId_idx" ON "RosterMember"("cityId");

-- CreateIndex
CREATE INDEX "RosterMember_globalSpeakerUuid_idx" ON "RosterMember"("globalSpeakerUuid");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_cityId_memberId_key" ON "RosterMember"("cityId", "memberId");

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
