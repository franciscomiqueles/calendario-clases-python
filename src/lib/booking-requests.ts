import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TIMEZONE,
  isBeforeTodayInTimeZone,
  isClassDurationValid,
  isWithinScheduleWindow,
  startOfTodayInTimeZone,
  type TimeInterval,
} from "@/lib/scheduling";
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
        const teacher = await transaction.user.findUnique({
          where: { id: teacherId },
          select: { timezone: true },
        });

        if (!teacher) {
          throw new Error("No se encontró la profesora.");
        }

        if (
          isBeforeTodayInTimeZone(
            interval.startAt,
            teacher.timezone || DEFAULT_TIMEZONE,
          )
        ) {
          throw new Error("No se pueden solicitar fechas anteriores a hoy.");
        }

        if (
          !isWithinScheduleWindow(
            interval,
            teacher.timezone || DEFAULT_TIMEZONE,
          )
        ) {
          throw new Error("El horario seleccionado está fuera del horario disponible.");
        }

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
            studentPhone: parsed.data.studentPhone,
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
  await deleteExpiredAcceptedBookings(teacherId);

  return prisma.bookingRequest.findMany({
    where: {
      teacherId,
      status: { in: ["ACCEPTED", "REJECTED"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteExpiredAcceptedBookings(teacherId: string) {
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { timezone: true },
  });

  if (!teacher) {
    return;
  }

  const cutoff = startOfTodayInTimeZone(teacher.timezone || DEFAULT_TIMEZONE);

  await prisma.$transaction(async (transaction) => {
    await transaction.scheduledClass.deleteMany({
      where: {
        teacherId,
        startAt: { lt: cutoff },
      },
    });

    await transaction.bookingRequest.deleteMany({
      where: {
        teacherId,
        status: "ACCEPTED",
        requestedStart: { lt: cutoff },
      },
    });
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

      const teacher = await transaction.user.findUnique({
        where: { id: teacherId },
        select: { timezone: true },
      });

      if (
        teacher &&
        isBeforeTodayInTimeZone(
          request.requestedStart,
          teacher.timezone || DEFAULT_TIMEZONE,
        )
      ) {
        throw new Error("No se pueden aceptar solicitudes de fechas anteriores a hoy.");
      }

      if (
        teacher &&
        !isWithinScheduleWindow(
          { startAt: request.requestedStart, endAt: request.requestedEnd },
          teacher.timezone || DEFAULT_TIMEZONE,
        )
      ) {
        throw new Error("El horario solicitado está fuera del horario disponible.");
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
          studentPhone: request.studentPhone,
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

export async function deleteRejectedRequest(
  teacherId: string,
  requestId: string,
) {
  const result = await prisma.bookingRequest.deleteMany({
    where: { id: requestId, teacherId, status: "REJECTED" },
  });

  if (result.count === 0) {
    throw new Error("Solo se pueden eliminar solicitudes rechazadas.");
  }
}
