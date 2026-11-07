-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'PHONE');

-- AlterTable: new KYC columns (selfieKey becomes the profile image)
ALTER TABLE "User" ADD COLUMN "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "studentCardKey" TEXT,
ADD COLUMN "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN "kycReviewedAt" TIMESTAMP(3),
ADD COLUMN "kycReviewedBy" TEXT,
ADD COLUMN "kycRejectReason" TEXT;
ALTER TABLE "User" RENAME COLUMN "selfieKey" TO "profileImageKey";

-- Existing data: previously approved accounts and admins stay approved (grandfathered, treated as
-- verified). Everyone else must complete the full KYC, since the old flow did not collect the
-- student card, profile image or email/phone verification.
UPDATE "User" SET "kycStatus" = 'APPROVED', "emailVerifiedAt" = NOW(), "phoneVerifiedAt" = NOW(), "kycReviewedAt" = NOW()
WHERE "idStatus" = 'APPROVED' OR "role" = 'ADMIN';
UPDATE "User" SET "kycStatus" = 'REJECTED', "kycRejectReason" = 'Please complete the new verification (email, phone, ID, student card, profile image).'
WHERE "idStatus" = 'REJECTED' AND "kycStatus" <> 'APPROVED';

-- Old verification column and enum are replaced by kycStatus
ALTER TABLE "User" DROP COLUMN "idStatus";
DROP TYPE "VerificationStatus";

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpCode_userId_channel_createdAt_idx" ON "OtpCode"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
