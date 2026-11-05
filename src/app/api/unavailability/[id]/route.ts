import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  deleteUnavailability,
  updateUnavailability,
} from "@/lib/unavailability";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(
      await updateUnavailability(teacherId, id, await request.json()),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteUnavailability(teacherId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
