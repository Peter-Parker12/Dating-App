-- AlterTable
ALTER TABLE "TalentProfile" ADD COLUMN     "availableNow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "district" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sticker" TEXT NOT NULL DEFAULT '';
