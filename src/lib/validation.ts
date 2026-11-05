import { z } from "zod";

const dateTime = z.coerce.date({
  error: "Debes indicar una fecha y hora válidas.",
});

export const timeWindowSchema = z
  .object({
    startAt: dateTime,
    endAt: dateTime,
  })
  .refine(({ startAt, endAt }) => startAt < endAt, {
    message: "La hora de inicio debe ser anterior a la hora de término.",
    path: ["endAt"],
  });

export const bookingRequestSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(100, "El nombre no puede superar los 100 caracteres."),
  studentEmail: z.email("Debes indicar un correo electrónico válido."),
  requestedStart: dateTime,
  requestedEnd: dateTime,
  comment: z
    .string()
    .trim()
    .max(500, "El comentario no puede superar los 500 caracteres.")
    .optional(),
});
