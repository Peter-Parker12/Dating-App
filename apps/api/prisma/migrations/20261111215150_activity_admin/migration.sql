-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'sparkles',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- The seven original activities keep their look and order
UPDATE "Activity" SET "icon" = 'coffee',         "sortOrder" = 10 WHERE "slug" = 'cafe';
UPDATE "Activity" SET "icon" = 'book-open',      "sortOrder" = 20 WHERE "slug" = 'study';
UPDATE "Activity" SET "icon" = 'landmark',       "sortOrder" = 30 WHERE "slug" = 'temple';
UPDATE "Activity" SET "icon" = 'party-popper',   "sortOrder" = 40 WHERE "slug" = 'party';
UPDATE "Activity" SET "icon" = 'users',          "sortOrder" = 50 WHERE "slug" = 'family';
UPDATE "Activity" SET "icon" = 'dumbbell',       "sortOrder" = 60 WHERE "slug" = 'gym';
UPDATE "Activity" SET "icon" = 'message-circle', "sortOrder" = 70 WHERE "slug" = 'online-chat';
