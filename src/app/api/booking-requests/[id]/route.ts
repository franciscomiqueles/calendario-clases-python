import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  acceptBookingRequest,
  deleteRejectedRequest,
  rejectBookingRequest,
} from "@/lib/booking-requests";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  try {
    const result =
      body.action === "accept"
        ? await acceptBookingRequest(session.user.id, id)
        : await rejectBookingRequest(session.user.id, id, body.rejectionReason);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operación inválida.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteRejectedRequest(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la solicitud.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
