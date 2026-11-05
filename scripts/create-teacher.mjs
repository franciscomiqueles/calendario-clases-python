import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const name = process.env.TEACHER_NAME?.trim();
const email = process.env.TEACHER_EMAIL?.trim().toLowerCase();
const password = process.env.TEACHER_PASSWORD;

if (!name || !email || !password) {
  throw new Error(
    "Define TEACHER_NAME, TEACHER_EMAIL y TEACHER_PASSWORD antes de ejecutar el script.",
  );
}

if (password.length < 8) {
  throw new Error("La contraseña debe tener al menos 8 caracteres.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const teacher = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });

  console.log(`Cuenta administrativa lista: ${teacher.name} (${teacher.email})`);
} finally {
  await prisma.$disconnect();
}
