-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "provinceCode" INTEGER,
ADD COLUMN     "ward" TEXT,
ADD COLUMN     "wardCode" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

