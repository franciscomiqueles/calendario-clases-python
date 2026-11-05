import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { cancelClass, updateClass } from "@/lib/classes";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(
      await updateClass(session.user.id, id, await request.json()),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos.";
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
    await cancelClass(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
