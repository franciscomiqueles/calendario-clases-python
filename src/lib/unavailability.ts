import { prisma } from "@/lib/prisma";
import { timeWindowSchema } from "@/lib/validation";

export async function listUnavailability(
  teacherId: string,
  range?: { startAt?: Date; endAt?: Date },
) {
  return prisma.unavailabilityWindow.findMany({
    where: {
      teacherId,
      ...(range?.startAt || range?.endAt
        ? {
            startAt: range.startAt ? { gte: range.startAt } : undefined,
            endAt: range.endAt ? { lte: range.endAt } : undefined,
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
  });
}

export async function createUnavailability(teacherId: string, input: unknown) {
  const parsed = timeWindowSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const existing = await prisma.unavailabilityWindow.findFirst({
    where: {
      teacherId,
      startAt: { lt: parsed.data.endAt },
      endAt: { gt: parsed.data.startAt },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("El bloqueo se superpone con otro existente.");
  }

  return prisma.unavailabilityWindow.create({
    data: { teacherId, ...parsed.data },
  });
}

export async function updateUnavailability(
  teacherId: string,
  id: string,
  input: unknown,
) {
  const parsed = timeWindowSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const existing = await prisma.unavailabilityWindow.findFirst({
    where: { id, teacherId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("El bloqueo no existe.");
  }

  const conflict = await prisma.unavailabilityWindow.findFirst({
    where: {
      teacherId,
      id: { not: id },
      startAt: { lt: parsed.data.endAt },
      endAt: { gt: parsed.data.startAt },
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("El bloqueo se superpone con otro existente.");
  }

  return prisma.unavailabilityWindow.update({
    where: { id },
    data: parsed.data,
  });
}

export async function deleteUnavailability(teacherId: string, id: string) {
  const existing = await prisma.unavailabilityWindow.findFirst({
    where: { id, teacherId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("El bloqueo no existe.");
  }

  return prisma.unavailabilityWindow.delete({ where: { id } });
}
