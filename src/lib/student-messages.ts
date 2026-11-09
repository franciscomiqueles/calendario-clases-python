import { del, put } from "@vercel/blob";

import { prisma } from "@/lib/prisma";

export async function listStudentMessages(teacherId: string) {
  return prisma.studentMessage.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadStudentMessage(
  teacherId: string,
  file: File,
  altText: string,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Falta configurar BLOB_READ_WRITE_TOKEN en .env.local.");
  }

  const extension = file.type.split("/")[1];
  const blob = await put(`student-messages/${teacherId}.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  try {
    return await prisma.studentMessage.create({
      data: { teacherId, url: blob.url, pathname: blob.pathname, altText },
    });
  } catch (error) {
    await del(blob.pathname);
    throw error;
  }
}

export async function deleteStudentMessage(teacherId: string, messageId: string) {
  const message = await prisma.studentMessage.findFirst({
    where: { id: messageId, teacherId },
  });

  if (!message) return { count: 0 };

  await del(message.pathname);
  await prisma.studentMessage.delete({ where: { id: messageId } });
  return { count: 1 };
}
