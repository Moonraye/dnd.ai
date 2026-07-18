-- CreateEnum
CREATE TYPE "ChatVisibility" AS ENUM ('PUBLIC', 'WHISPER');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "recipientCharacterId" UUID,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientUserId" UUID,
ADD COLUMN     "senderCharacterId" UUID,
ADD COLUMN     "senderUserId" UUID,
ADD COLUMN     "visibility" "ChatVisibility" NOT NULL DEFAULT 'PUBLIC';
