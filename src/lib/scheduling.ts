export const CLASS_DURATION_MINUTES = 60;
export const DEFAULT_TIMEZONE = "America/Santiago";

type ScheduleWindow = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

function getZonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    hour12: false,
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function getScheduleWindow(
  value: Date,
  timeZone = DEFAULT_TIMEZONE,
): ScheduleWindow {
  const { weekday } = getZonedParts(value, timeZone);
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  return isWeekend
    ? { startHour: 10, startMinute: 0, endHour: 23, endMinute: 0 }
    : { startHour: 8, startMinute: 0, endHour: 19, endMinute: 30 };
}

export function isWithinScheduleWindow(
  interval: { startAt: Date; endAt: Date },
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  const start = getZonedParts(interval.startAt, timeZone);
  const end = getZonedParts(interval.endAt, timeZone);
  const window = getScheduleWindow(interval.startAt, timeZone);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const windowStart = window.startHour * 60 + window.startMinute;
  const windowEnd = window.endHour * 60 + window.endMinute;

  return (
    start.weekday === end.weekday &&
    startMinutes >= windowStart &&
    endMinutes <= windowEnd
  );
}

export type TimeInterval = {
  startAt: Date;
  endAt: Date;
};

export function dateInTimeZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(value);
}

export function startOfTodayInTimeZone(
  timeZone = DEFAULT_TIMEZONE,
  now = new Date(),
): Date {
  const date = dateInTimeZone(now, timeZone);
  const utcGuess = new Date(`${date}T00:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    hour12: false,
  }).formatToParts(utcGuess);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offset = localAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset);
}

export function isBeforeTodayInTimeZone(
  value: Date,
  timeZone: string,
): boolean {
  return dateInTimeZone(value, timeZone) < dateInTimeZone(new Date(), timeZone);
}

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
