import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  deleteStudentMessage,
  listStudentMessages,
  uploadStudentMessage,
} from "@/lib/student-messages";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function getTeacherId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const requestedTeacherId = new URL(request.url).searchParams.get("teacherId");
  const teacherId = requestedTeacherId === "dashboard"
    ? session?.user?.id
    : requestedTeacherId;
  if (!teacherId) return NextResponse.json({ error: "La profesora es obligatoria." }, { status: 400 });
  if (requestedTeacherId === "dashboard" && !session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json(await listStudentMessages(teacherId));
}

export async function POST(request: Request) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const altText = formData.get("altText");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WebP." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "La imagen no puede superar los 5 MB." }, { status: 400 });
  }
  if (typeof altText !== "string" || !altText.trim() || altText.length > 120) {
    return NextResponse.json({ error: "Describe brevemente la imagen." }, { status: 400 });
  }

  try {
    const message = await uploadStudentMessage(teacherId, file, altText.trim());
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const teacherId = await getTeacherId();
  if (!teacherId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const messageId = new URL(request.url).searchParams.get("id");
  if (!messageId) return NextResponse.json({ error: "La imagen es obligatoria." }, { status: 400 });

  const result = await deleteStudentMessage(teacherId, messageId);
  if (!result.count) return NextResponse.json({ error: "La imagen no existe." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
