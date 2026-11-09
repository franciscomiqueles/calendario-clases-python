DROP TABLE "ReviewImage";

ALTER TABLE "Review"
ALTER COLUMN "studentName" DROP NOT NULL;

CREATE TABLE "StudentMessage" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentMessage_teacherId_createdAt_idx"
ON "StudentMessage"("teacherId", "createdAt");

ALTER TABLE "StudentMessage"
ADD CONSTRAINT "StudentMessage_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
