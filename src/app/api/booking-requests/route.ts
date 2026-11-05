import { NextResponse } from "next/server";

import { createBookingRequest } from "@/lib/booking-requests";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacherId =
      typeof body.teacherId === "string" ? body.teacherId : undefined;

    if (!teacherId) {
      return NextResponse.json(
        { error: "La profesora es obligatoria." },
        { status: 400 },
      );
    }

    const bookingRequest = await createBookingRequest(teacherId, body);
    return NextResponse.json(
      {
        id: bookingRequest.id,
        trackingToken: bookingRequest.trackingToken,
        status: bookingRequest.status,
        requestedStart: bookingRequest.requestedStart,
        requestedEnd: bookingRequest.requestedEnd,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos.";
    const status = message.includes("disponible") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
