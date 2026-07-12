-- AlterTable
ALTER TABLE "GameStateLog" ADD COLUMN     "keyFacts" JSONB NOT NULL DEFAULT '[]';
