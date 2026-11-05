import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  acceptBookingRequest,
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
