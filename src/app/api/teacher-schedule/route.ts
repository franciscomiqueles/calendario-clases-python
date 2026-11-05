import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [unavailability, classes] = await Promise.all([
    prisma.unavailabilityWindow.findMany({
      where: { teacherId: session.user.id },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, endAt: true },
    }),
    prisma.scheduledClass.findMany({
      where: { teacherId: session.user.id, status: "CONFIRMED" },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        studentName: true,
        startAt: true,
        endAt: true,
      },
    }),
  ]);

  return NextResponse.json({ unavailability, classes });
}
