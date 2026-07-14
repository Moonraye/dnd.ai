-- AlterTable
ALTER TABLE "CharacterSheet" ADD COLUMN     "ownerId" UUID,
ADD COLUMN     "persona" TEXT;

-- CreateIndex
CREATE INDEX "CharacterSheet_ownerId_idx" ON "CharacterSheet"("ownerId");

-- AddForeignKey
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
