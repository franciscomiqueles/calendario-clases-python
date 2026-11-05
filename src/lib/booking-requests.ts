import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isClassDurationValid, type TimeInterval } from "@/lib/scheduling";
import { bookingRequestSchema } from "@/lib/validation";

export async function createBookingRequest(teacherId: string, input: unknown) {
  const parsed = bookingRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const interval: TimeInterval = {
    startAt: parsed.data.requestedStart,
    endAt: parsed.data.requestedEnd,
  };

  if (!isClassDurationValid(interval)) {
    throw new Error("La clase debe durar exactamente 60 minutos.");
  }

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const blocked = await transaction.unavailabilityWindow.findFirst({
          where: {
            teacherId,
            startAt: { lt: interval.endAt },
            endAt: { gt: interval.startAt },
          },
          select: { id: true },
        });

        if (blocked) {
          throw new Error("El horario seleccionado no está disponible.");
        }

        const conflict = await transaction.bookingRequest.findFirst({
          where: {
            teacherId,
            status: "PENDING",
            requestedStart: { lt: interval.endAt },
            requestedEnd: { gt: interval.startAt },
          },
          select: { id: true },
        });

        const confirmed = await transaction.scheduledClass.findFirst({
          where: {
            teacherId,
            status: "CONFIRMED",
            startAt: { lt: interval.endAt },
            endAt: { gt: interval.startAt },
          },
          select: { id: true },
        });

        if (conflict || confirmed) {
          throw new Error("El horario seleccionado ya no está disponible.");
        }

        return transaction.bookingRequest.create({
          data: {
            teacherId,
            studentName: parsed.data.studentName,
            studentEmail: parsed.data.studentEmail.toLowerCase(),
            requestedStart: interval.startAt,
            requestedEnd: interval.endAt,
            comment: parsed.data.comment || null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("disponible")) {
      throw error;
    }

    throw new Error("No se pudo registrar la solicitud.");
  }
}

export async function listPendingRequests(teacherId: string) {
  return prisma.bookingRequest.findMany({
    where: { teacherId, status: "PENDING" },
    orderBy: { requestedStart: "asc" },
  });
}

export async function listRequestHistory(teacherId: string) {
  return prisma.bookingRequest.findMany({
    where: {
      teacherId,
      status: { in: ["ACCEPTED", "REJECTED"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPublicRequestStatus(
  teacherId: string,
  trackingToken: string,
) {
  return prisma.bookingRequest.findFirst({
    where: { teacherId, trackingToken },
    select: {
      requestedStart: true,
      requestedEnd: true,
      status: true,
      rejectionReason: true,
      scheduledClass: { select: { status: true } },
    },
  });
}

export async function acceptBookingRequest(teacherId: string, requestId: string) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const request = await transaction.bookingRequest.findFirst({
        where: { id: requestId, teacherId, status: "PENDING" },
      });

      if (!request) {
        throw new Error("La solicitud no existe o ya fue gestionada.");
      }

      const blocked = await transaction.unavailabilityWindow.findFirst({
        where: {
          teacherId,
          startAt: { lt: request.requestedEnd },
          endAt: { gt: request.requestedStart },
        },
        select: { id: true },
      });

      const confirmed = await transaction.scheduledClass.findFirst({
        where: {
          teacherId,
          status: "CONFIRMED",
          startAt: { lt: request.requestedEnd },
          endAt: { gt: request.requestedStart },
        },
        select: { id: true },
      });

      if (blocked || confirmed) {
        throw new Error("El horario ya no está disponible.");
      }

      const accepted = await transaction.bookingRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
      });

      await transaction.scheduledClass.create({
        data: {
          teacherId,
          requestId,
          studentName: request.studentName,
          studentEmail: request.studentEmail,
          startAt: request.requestedStart,
          endAt: request.requestedEnd,
        },
      });

      return accepted;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingClass = await prisma.scheduledClass.findFirst({
        where: { requestId, teacherId },
        select: { id: true },
      });

      if (existingClass) {
        return prisma.bookingRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED" },
        });
      }
    }

    throw error;
  }
}

export async function rejectBookingRequest(
  teacherId: string,
  requestId: string,
  rejectionReason?: string,
) {
  const request = await prisma.bookingRequest.findFirst({
    where: { id: requestId, teacherId, status: "PENDING" },
    select: { id: true },
  });

  if (!request) {
    throw new Error("La solicitud no existe o ya fue gestionada.");
  }

  return prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectionReason: rejectionReason?.trim() || null,
    },
  });
}
