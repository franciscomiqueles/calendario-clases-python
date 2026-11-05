import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  createUnavailability,
  listUnavailability,
} from "@/lib/unavailability";

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function GET(request: Request) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const startAt = parseDate(url.searchParams.get("startAt"));
  const endAt = parseDate(url.searchParams.get("endAt"));

  if (
    (url.searchParams.has("startAt") && !startAt) ||
    (url.searchParams.has("endAt") && !endAt)
  ) {
    return NextResponse.json(
      { error: "Los filtros de fecha deben ser válidos." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await listUnavailability(teacherId, { startAt, endAt }),
    );
  } catch (error) {
    console.error("Failed to list unavailability.", error);
    return NextResponse.json(
      { error: "No se pudo consultar los bloqueos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const unavailability = await createUnavailability(
      teacherId,
      await request.json(),
    );
    return NextResponse.json(unavailability, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
