-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('LOBBY', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('HUMAN', 'AI_DM', 'AI_PLAYER');

-- CreateTable
CREATE TABLE "CampaignSession" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "creatorId" UUID NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'LOBBY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSheet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hpCurrent" INTEGER NOT NULL,
    "hpMax" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "inventory" JSONB NOT NULL DEFAULT '[]',
    "aiProvider" TEXT,
    "aiModel" TEXT,

    CONSTRAINT "CharacterSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderName" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStateLog" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "activeQuests" JSONB NOT NULL DEFAULT '[]',
    "npcRelationships" JSONB NOT NULL DEFAULT '{}',
    "campaignSummary" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameStateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignSession_creatorId_idx" ON "CampaignSession"("creatorId");

-- CreateIndex
CREATE INDEX "CharacterSheet_sessionId_idx" ON "CharacterSheet"("sessionId");

-- CreateIndex
CREATE INDEX "CharacterSheet_userId_idx" ON "CharacterSheet"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameStateLog_sessionId_key" ON "GameStateLog"("sessionId");

-- AddForeignKey
ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CampaignSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CampaignSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStateLog" ADD CONSTRAINT "GameStateLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CampaignSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
