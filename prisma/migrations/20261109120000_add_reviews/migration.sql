CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewImage" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Review_teacherId_status_createdAt_idx"
ON "Review"("teacherId", "status", "createdAt");

CREATE INDEX "ReviewImage_reviewId_createdAt_idx"
ON "ReviewImage"("reviewId", "createdAt");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewImage"
ADD CONSTRAINT "ReviewImage_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "Review"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
