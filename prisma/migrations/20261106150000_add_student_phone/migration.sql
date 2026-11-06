ALTER TABLE "BookingRequest"
ADD COLUMN "studentPhone" TEXT NOT NULL DEFAULT '';

ALTER TABLE "BookingRequest"
ALTER COLUMN "studentEmail" DROP NOT NULL;

ALTER TABLE "ScheduledClass"
ADD COLUMN "studentPhone" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ScheduledClass"
ALTER COLUMN "studentEmail" DROP NOT NULL;
