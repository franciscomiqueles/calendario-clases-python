ALTER TABLE "BookingRequest" ADD COLUMN "trackingToken" TEXT;

UPDATE "BookingRequest"
SET "trackingToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "trackingToken" IS NULL;

ALTER TABLE "BookingRequest" ALTER COLUMN "trackingToken" SET NOT NULL;

CREATE UNIQUE INDEX "BookingRequest_trackingToken_key"
ON "BookingRequest"("trackingToken");
