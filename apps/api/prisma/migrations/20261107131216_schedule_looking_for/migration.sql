-- AlterTable
ALTER TABLE "TalentProfile" ADD COLUMN     "schedule" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lookingFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lookingForNote" TEXT NOT NULL DEFAULT '';
