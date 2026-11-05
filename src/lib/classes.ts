import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TIMEZONE,
  isClassDurationValid,
  isWithinScheduleWindow,
} from "@/lib/scheduling";
import { timeWindowSchema } from "@/lib/validation";

export async function listConfirmedClasses(teacherId: string) {
  return prisma.scheduledClass.findMany({
    where: { teacherId, status: "CONFIRMED" },
    orderBy: { startAt: "asc" },
  });
}

export async function updateClass(
  teacherId: string,
  classId: string,
  input: unknown,
) {
  const parsed = timeWindowSchema.safeParse(input);

  if (!parsed.success || !isClassDurationValid(parsed.data)) {
    throw new Error("La clase debe durar exactamente 60 minutos.");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { timezone: true },
  });

  if (
    !isWithinScheduleWindow(
      parsed.data,
      teacher?.timezone || DEFAULT_TIMEZONE,
    )
  ) {
    throw new Error("El nuevo horario está fuera del horario disponible.");
  }

  const current = await prisma.scheduledClass.findFirst({
    where: { id: classId, teacherId, status: "CONFIRMED" },
    select: { id: true },
  });

  if (!current) {
    throw new Error("La clase no existe o ya fue cancelada.");
  }

  const [blocked, conflict] = await Promise.all([
    prisma.unavailabilityWindow.findFirst({
      where: {
        teacherId,
        startAt: { lt: parsed.data.endAt },
        endAt: { gt: parsed.data.startAt },
      },
      select: { id: true },
    }),
    prisma.scheduledClass.findFirst({
      where: {
        teacherId,
        id: { not: classId },
        status: "CONFIRMED",
        startAt: { lt: parsed.data.endAt },
        endAt: { gt: parsed.data.startAt },
      },
      select: { id: true },
    }),
  ]);

  if (blocked || conflict) {
    throw new Error("El nuevo horario no está disponible.");
  }

  return prisma.scheduledClass.update({
    where: { id: classId },
    data: parsed.data,
  });
}

export async function cancelClass(teacherId: string, classId: string) {
  const current = await prisma.scheduledClass.findFirst({
    where: { id: classId, teacherId, status: "CONFIRMED" },
    select: { id: true },
  });

  if (!current) {
    throw new Error("La clase no existe o ya fue cancelada.");
  }

  return prisma.scheduledClass.update({
    where: { id: classId },
    data: { status: "CANCELLED" },
  });
}
