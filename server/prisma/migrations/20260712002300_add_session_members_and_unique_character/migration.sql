-- CreateTable
CREATE TABLE "SessionMember" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionMember_userId_sessionId_key" ON "SessionMember"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "SessionMember_sessionId_idx" ON "SessionMember"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSheet_userId_sessionId_key" ON "CharacterSheet"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "SessionMember" ADD CONSTRAINT "SessionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMember" ADD CONSTRAINT "SessionMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CampaignSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
