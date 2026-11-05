import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const teacherId = new URL(request.url).searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json(
      { error: "El parámetro teacherId es obligatorio." },
      { status: 400 },
    );
  }

  try {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        name: true,
        timezone: true,
        unavailability: {
          orderBy: { startAt: "asc" },
          select: { id: true, startAt: true, endAt: true },
        },
        classes: {
          where: { status: "CONFIRMED" },
          orderBy: { startAt: "asc" },
          select: { id: true, startAt: true, endAt: true },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "No se encontró la profesora." },
        { status: 404 },
      );
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Failed to load public schedule.", error);
    return NextResponse.json(
      { error: "No se pudo cargar el calendario." },
      { status: 500 },
    );
  }
}
