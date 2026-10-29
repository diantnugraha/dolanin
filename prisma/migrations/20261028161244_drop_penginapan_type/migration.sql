-- Penginapan is no longer a listing type: existing Penginapan listings, and their tracked events, become Hotel.
-- AlterEnum
BEGIN;
UPDATE "Listing" SET "type" = 'HOTEL' WHERE "type" = 'PENGINAPAN';
UPDATE "Event" SET "type" = 'HOTEL' WHERE "type" = 'PENGINAPAN';
CREATE TYPE "ListingType_new" AS ENUM ('HOTEL', 'VILLA');
ALTER TABLE "Listing" ALTER COLUMN "type" TYPE "ListingType_new" USING ("type"::text::"ListingType_new");
ALTER TABLE "Event" ALTER COLUMN "type" TYPE "ListingType_new" USING ("type"::text::"ListingType_new");
ALTER TYPE "ListingType" RENAME TO "ListingType_old";
ALTER TYPE "ListingType_new" RENAME TO "ListingType";
DROP TYPE "public"."ListingType_old";
COMMIT;
