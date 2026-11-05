/*
  Warnings:

  - You are about to drop the `AvailabilityWindow` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AvailabilityWindow" DROP CONSTRAINT "AvailabilityWindow_teacherId_fkey";

-- DropTable
DROP TABLE "AvailabilityWindow";

-- CreateTable
CREATE TABLE "UnavailabilityWindow" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnavailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnavailabilityWindow_teacherId_startAt_idx" ON "UnavailabilityWindow"("teacherId", "startAt");

-- AddForeignKey
ALTER TABLE "UnavailabilityWindow" ADD CONSTRAINT "UnavailabilityWindow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
