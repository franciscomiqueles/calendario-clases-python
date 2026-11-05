import { NextResponse } from "next/server";

import { getPublicRequestStatus } from "@/lib/booking-requests";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const teacherId = searchParams.get("teacherId");
  const trackingToken = searchParams.get("token");

  if (!teacherId || !trackingToken) {
    return NextResponse.json(
      { error: "El código de seguimiento es obligatorio." },
      { status: 400 },
    );
  }

  const bookingRequest = await getPublicRequestStatus(
    teacherId,
    trackingToken,
  );

  if (!bookingRequest) {
    return NextResponse.json(
      { error: "No se encontró una solicitud con ese código." },
      { status: 404 },
    );
  }

  return NextResponse.json(bookingRequest);
}
