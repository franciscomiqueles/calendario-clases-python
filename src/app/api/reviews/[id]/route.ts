import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { deleteReview, updateReviewStatus } from "@/lib/reviews";

type RouteContext = { params: Promise<{ id: string }> };

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const status = body.status;

  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateReviewStatus(teacherId, id, status);

  if (result.count === 0) {
    return NextResponse.json({ error: "La reseña no existe." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const teacherId = await getTeacherId();

  if (!teacherId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await deleteReview(teacherId, id);

  if (result.count === 0) {
    return NextResponse.json({ error: "La reseña no existe." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
