-- Booking links per channel replace Listing.affiliateUrl + Listing.waNumber.
-- Old data is moved, not dropped:
--   affiliateUrl on agoda/traveloka/trip/tiket/booking .com (or a subdomain) -> that channel;
--   any other affiliateUrl (e.g. short links like invol.co) -> Listing.legacyUrl, shown in the CMS until re-saved;
--   waNumber, or Setting.waDefault when the listing had none -> a WHATSAPP link https://wa.me/{number};
--   Event PESAN -> CLICK with the channel of the listing's affiliateUrl (null when unknown), WA -> CLICK/WHATSAPP.
BEGIN;

-- CreateEnum
CREATE TYPE "BookingChannel" AS ENUM ('AGODA', 'TRAVELOKA', 'TRIP', 'TIKET', 'BOOKING', 'WHATSAPP');

-- CreateTable
CREATE TABLE "ListingLink" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "channel" "BookingChannel" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ListingLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingLink_listingId_channel_key" ON "ListingLink"("listingId", "channel");

-- AddForeignKey
ALTER TABLE "ListingLink" ADD CONSTRAINT "ListingLink_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "legacyUrl" TEXT;

-- Host -> channel, only for this migration's session.
CREATE FUNCTION pg_temp.channel_of(u text) RETURNS "BookingChannel" LANGUAGE sql IMMUTABLE AS $$
  SELECT (CASE
    WHEN h ~ '(^|\.)agoda\.com$' THEN 'AGODA'
    WHEN h ~ '(^|\.)traveloka\.com$' THEN 'TRAVELOKA'
    WHEN h ~ '(^|\.)trip\.com$' THEN 'TRIP'
    WHEN h ~ '(^|\.)tiket\.com$' THEN 'TIKET'
    WHEN h ~ '(^|\.)booking\.com$' THEN 'BOOKING'
  END)::"BookingChannel"
  FROM (SELECT substring(lower(u) from '^https?://([^/?#:@]+)') AS h) AS x
$$;

-- Move affiliate links
INSERT INTO "ListingLink" ("id", "listingId", "channel", "url")
SELECT gen_random_uuid()::text, "id", pg_temp.channel_of("affiliateUrl"), "affiliateUrl"
FROM "Listing"
WHERE pg_temp.channel_of("affiliateUrl") IS NOT NULL;

UPDATE "Listing" SET "legacyUrl" = "affiliateUrl"
WHERE pg_temp.channel_of("affiliateUrl") IS NULL AND "affiliateUrl" ~* '^https?://';

-- Move WhatsApp numbers
INSERT INTO "ListingLink" ("id", "listingId", "channel", "url")
SELECT gen_random_uuid()::text, l."id", 'WHATSAPP', 'https://wa.me/' || COALESCE(l."waNumber", s."waDefault")
FROM "Listing" l
LEFT JOIN "Setting" s ON s."id" = 1
WHERE COALESCE(l."waNumber", s."waDefault") IS NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "channel" "BookingChannel";

UPDATE "Event" SET "channel" = 'WHATSAPP' WHERE "kind" = 'WA';
UPDATE "Event" e SET "channel" = pg_temp.channel_of(l."affiliateUrl")
FROM "Listing" l
WHERE l."id" = e."listingId" AND e."kind" = 'PESAN';

-- AlterEnum
CREATE TYPE "EventKind_new" AS ENUM ('VIEW', 'CLICK');
ALTER TABLE "Event" ALTER COLUMN "kind" TYPE "EventKind_new"
  USING (CASE WHEN "kind"::text = 'VIEW' THEN 'VIEW' ELSE 'CLICK' END)::"EventKind_new";
ALTER TYPE "EventKind" RENAME TO "EventKind_old";
ALTER TYPE "EventKind_new" RENAME TO "EventKind";
DROP TYPE "public"."EventKind_old";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "affiliateUrl",
DROP COLUMN "waNumber";

COMMIT;
