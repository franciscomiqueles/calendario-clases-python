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
  studentPhone: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, "Debes indicar un número de teléfono válido."),
  requestedStart: dateTime,
  requestedEnd: dateTime,
  comment: z
    .string()
    .trim()
    .max(500, "El comentario no puede superar los 500 caracteres.")
    .optional(),
});

export const reviewSchema = z.object({
  studentName: z
    .string()
    .trim()
    .max(80, "El nombre no puede superar los 80 caracteres.")
    .optional()
    .or(z.literal("")),
  rating: z.coerce
    .number()
    .int("La calificación debe ser un número entero.")
    .min(1, "La calificación mínima es 1.")
    .max(5, "La calificación máxima es 5."),
  comment: z
    .string()
    .trim()
    .min(1, "El comentario es obligatorio.")
    .max(800, "El comentario no puede superar los 800 caracteres."),
  topic: z
    .string()
    .trim()
    .min(1, "Indica el curso o tema de la clase.")
    .max(120, "El tema no puede superar los 120 caracteres."),
  website: z.string().max(0, "Solicitud inválida.").optional(),
});
