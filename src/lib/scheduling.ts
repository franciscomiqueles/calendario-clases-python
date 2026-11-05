export const CLASS_DURATION_MINUTES = 60;

export type TimeInterval = {
  startAt: Date;
  endAt: Date;
};

export function calculateClassEnd(startAt: Date): Date {
  return new Date(startAt.getTime() + CLASS_DURATION_MINUTES * 60_000);
}

export function intervalsOverlap(
  first: TimeInterval,
  second: TimeInterval,
): boolean {
  return first.startAt < second.endAt && first.endAt > second.startAt;
}

export function intervalContains(
  container: TimeInterval,
  interval: TimeInterval,
): boolean {
  return (
    interval.startAt >= container.startAt && interval.endAt <= container.endAt
  );
}

export function isClassDurationValid(interval: TimeInterval): boolean {
  return (
    interval.endAt.getTime() - interval.startAt.getTime() ===
    CLASS_DURATION_MINUTES * 60_000
  );
}

export function validateClassInterval(
  interval: TimeInterval,
  availability: TimeInterval,
): string | null {
  if (interval.startAt >= interval.endAt) {
    return "La hora de inicio debe ser anterior a la hora de término.";
  }

  if (!isClassDurationValid(interval)) {
    return "La clase debe durar exactamente 60 minutos.";
  }

  if (!intervalContains(availability, interval)) {
    return "El horario solicitado está fuera de la disponibilidad.";
  }

  return null;
}
