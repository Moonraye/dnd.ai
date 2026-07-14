-- AlterEnum
ALTER TYPE "SenderType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "metadata" JSONB;
