import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validation";

export async function listApprovedReviews(teacherId: string) {
  return prisma.review.findMany({
    where: { teacherId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReview(teacherId: string, input: unknown) {
  const parsed = reviewSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  return prisma.review.create({
    data: {
      teacherId,
      studentName: parsed.data.studentName || null,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      topic: parsed.data.topic,
      consentAt: new Date(),
    },
  });
}

export async function listTeacherReviews(teacherId: string) {
  return prisma.review.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateReviewStatus(
  teacherId: string,
  reviewId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
) {
  return prisma.review.updateMany({
    where: { id: reviewId, teacherId },
    data: { status },
  });
}

export async function deleteReview(teacherId: string, reviewId: string) {
  return prisma.review.deleteMany({ where: { id: reviewId, teacherId } });
}
