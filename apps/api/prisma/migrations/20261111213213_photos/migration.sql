-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('PROFILE', 'GALLERY');

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "key" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReason" TEXT,
    "hiddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoReport" (
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoReport_pkey" PRIMARY KEY ("photoId","userId")
);

-- CreateIndex
CREATE INDEX "Photo_userId_kind_idx" ON "Photo"("userId", "kind");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoReport" ADD CONSTRAINT "PhotoReport_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoReport" ADD CONSTRAINT "PhotoReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
