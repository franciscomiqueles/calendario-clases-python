import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  createReview,
  listApprovedReviews,
  listTeacherReviews,
} from "@/lib/reviews";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const teacherId =
    new URL(request.url).searchParams.get("teacherId") ?? session?.user?.id;

  if (!teacherId) {
    return NextResponse.json(
      { error: "La profesora es obligatoria." },
      { status: 400 },
    );
  }

  const isTeacher = session?.user?.id === teacherId;

  return NextResponse.json(
    isTeacher
      ? await listTeacherReviews(teacherId)
      : await listApprovedReviews(teacherId),
  );
}

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

    const review = await createReview(teacherId, body);
    return NextResponse.json(
      { id: review.id, status: review.status },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
