"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DateSelectArg, EventInput } from "@fullcalendar/core";

import styles from "./public-calendar.module.css";
import {
  CLASS_DURATION_MINUTES,
  DEFAULT_TIMEZONE,
  dateInTimeZone,
  getScheduleWindow,
  intervalsOverlap,
  isWithinScheduleWindow,
} from "@/lib/scheduling";

type ScheduleResponse = {
  name: string;
  timezone: string;
  unavailability: Array<{
    id: string;
    startAt: string;
    endAt: string;
  }>;
  classes: Array<{
    id: string;
    startAt: string;
    endAt: string;
  }>;
};

type SelectedSlot = {
  id: string;
  start: Date;
  end: Date;
};

type RequestStatus = {
  requestedStart: string;
  requestedEnd: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  scheduledClass: { status: "CONFIRMED" | "CANCELLED" } | null;
};

const PHONE_CODES = [
  ["+56", "Chile"],
  ["+54", "Argentina"],
  ["+51", "Perú"],
  ["+591", "Bolivia"],
  ["+55", "Brasil"],
  ["+57", "Colombia"],
  ["+52", "México"],
  ["+1", "Estados Unidos / Canadá"],
  ["+34", "España"],
] as const;

function inputDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(value);
}

function inputTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(value);
}

function formatSelection(start: Date, end: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).formatRange(start, end);
}

export function PublicCalendar({ teacherId }: { teacherId: string }) {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [trackingTokens, setTrackingTokens] = useState<string[]>([]);
  const [trackingToken, setTrackingToken] = useState("");
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState("");
  const adjustingSelection = useRef(false);
  const allowAdditionalMobileSlotRef = useRef(false);
  const lastMobileSelection = useRef<{ startAt: number; timestamp: number } | null>(
    null,
  );
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const today = dateInTimeZone(new Date(), schedule?.timezone ?? DEFAULT_TIMEZONE);

  const loadSchedule = useCallback(async () => {
    const response = await fetch(`/api/public-schedule?teacherId=${teacherId}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo cargar el calendario.");
      return;
    }

    setSchedule(data);
  }, [teacherId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSchedule(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSchedule]);

  useEffect(() => {
    if (error || submitted) {
      noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error, submitted]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  function addSlot(start: Date, allowMultiple: boolean): boolean {
    const automaticEnd = new Date(
      start.getTime() + CLASS_DURATION_MINUTES * 60_000,
    );
    const interval = { startAt: start, endAt: automaticEnd };
    const alreadySelected = selectedSlots.some(
      (slot) => slot.start.getTime() === start.getTime(),
    );

    if (allowMultiple && alreadySelected) {
      return false;
    }

    if (!isWithinScheduleWindow(interval, schedule?.timezone)) {
      setError("Ese inicio no permite completar una clase dentro del horario disponible.");
      return false;
    }

    const unavailable = [
      ...(schedule?.unavailability ?? []),
      ...(schedule?.classes ?? []),
    ].some((item) =>
      intervalsOverlap(interval, {
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt),
      }),
    );
    const selectedConflict = selectedSlots.some((slot) =>
      intervalsOverlap(interval, { startAt: slot.start, endAt: slot.end }),
    );

    if (unavailable || selectedConflict) {
      setError(
        unavailable
          ? "Ese horario no está disponible."
          : "Ese horario se solapa con otra selección.",
      );
      return false;
    }

    setSelectedSlots((current) => {
      const next = allowMultiple
        ? [...current, { id: `${start.getTime()}`, start, end: automaticEnd }]
        : [{ id: `${start.getTime()}`, start, end: automaticEnd }];
      return next.sort(
        (first, second) => first.start.getTime() - second.start.getTime(),
      );
    });
    setSubmitted(false);
    setError("");
    return true;
  }

  function handleDateClick(info: DateClickArg) {
    if (info.allDay) {
      return;
    }

    const now = Date.now();
    const previousSelection = lastMobileSelection.current;
    if (
      previousSelection &&
      previousSelection.startAt === info.date.getTime() &&
      now - previousSelection.timestamp < 500
    ) {
      return;
    }

    lastMobileSelection.current = {
      startAt: info.date.getTime(),
      timestamp: now,
    };
    const allowMultiple = allowAdditionalMobileSlotRef.current;
    allowAdditionalMobileSlotRef.current = false;
    addSlot(info.date, allowMultiple);
  }

  function handleSelect(info: DateSelectArg) {
    if (adjustingSelection.current) {
      adjustingSelection.current = false;
      return;
    }

    const automaticEnd = new Date(
      info.start.getTime() + CLASS_DURATION_MINUTES * 60_000,
    );

    if (info.end.getTime() !== automaticEnd.getTime()) {
      adjustingSelection.current = true;
      info.view.calendar.select({
        start: info.start,
        end: automaticEnd,
      });
    }

    if (!addSlot(info.start, true)) {
      info.view.calendar.unselect();
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (selectedSlots.length === 0) {
      setError("Selecciona al menos un horario en el calendario.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const results: Array<{
      slot: SelectedSlot;
      response: Response;
      data: { error?: string; trackingToken?: string };
    }> = [];

    for (const slot of selectedSlots) {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          studentName: formData.get("studentName"),
          studentPhone: `${formData.get("countryCode")}${String(
            formData.get("studentPhone"),
          ).replace(/\D/g, "")}`,
          comment: formData.get("comment"),
          requestedStart: slot.start.toISOString(),
          requestedEnd: slot.end.toISOString(),
        }),
      });
      results.push({ slot, response, data: await response.json() });
    }
    const failed = results.filter(({ response }) => !response.ok);
    const successful = results.filter(({ response }) => response.ok);

    if (successful.length === 0) {
      setSubmitted(false);
      setError(
        failed[0]?.data.error ?? "No se pudieron enviar las solicitudes.",
      );
    } else if (failed.length > 0) {
      setSubmitted(false);
      setSelectedSlots(failed.map(({ slot }) => slot));
      setError(
        `${successful.length} solicitud(es) enviada(s). ${failed.length} no se pudo enviar; revisa los horarios restantes.`,
      );
    } else {
      setError("");
      setSubmitted(true);
      setTrackingTokens(
        successful
          .map(({ data }) => data.trackingToken)
          .filter((token): token is string => Boolean(token)),
      );
      setSelectedSlots([]);
      form.reset();
    }

    setIsSubmitting(false);
  }

  async function checkRequestStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingStatus(true);
    setError("");
    setRequestStatus(null);

    const response = await fetch(
      `/api/booking-requests/status?teacherId=${encodeURIComponent(
        teacherId,
      )}&token=${encodeURIComponent(trackingToken.trim())}`,
    );
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo consultar la solicitud.");
    } else {
      setRequestStatus(data);
    }

    setIsCheckingStatus(false);
  }

  function statusLabel(status: RequestStatus) {
    if (status.status === "PENDING") return "Pendiente de aprobación";
    if (status.status === "REJECTED") return "Rechazada";
    return status.scheduledClass?.status === "CANCELLED"
      ? "Aceptada, pero la clase fue cancelada"
      : "Aceptada";
  }

  function beginEdit(slot: SelectedSlot) {
    setEditingSlotId(slot.id);
    setEditingDate(inputDate(slot.start));
    setEditingTime(inputTime(slot.start));
  }

  function saveEdit() {
    if (!editingSlotId || !editingDate || !editingTime) {
      return;
    }

    const start = new Date(`${editingDate}T${editingTime}:00`);
    const end = new Date(start.getTime() + CLASS_DURATION_MINUTES * 60_000);
    const window = getScheduleWindow(start, schedule?.timezone);
    const dayEnd = new Date(start);
    dayEnd.setHours(window.endHour, window.endMinute, 0, 0);

    if (end > dayEnd) {
      setError(
        `Ese inicio no permite completar una clase antes de las ${String(
          window.endHour,
        ).padStart(2, "0")}:${String(window.endMinute).padStart(2, "0")}.`,
      );
      return;
    }

    const conflictsWithSchedule = [
      ...(schedule?.unavailability ?? []),
      ...(schedule?.classes ?? []),
    ].some((item) =>
      intervalsOverlap(
        { startAt: start, endAt: end },
        { startAt: new Date(item.startAt), endAt: new Date(item.endAt) },
      ),
    );
    const conflictsWithSelection = selectedSlots.some(
      (slot) =>
        slot.id !== editingSlotId &&
        intervalsOverlap(
          { startAt: start, endAt: end },
          { startAt: slot.start, endAt: slot.end },
        ),
    );

    if (conflictsWithSchedule || conflictsWithSelection) {
      setError(
        conflictsWithSchedule
          ? "Ese horario no está disponible."
          : "Ese horario se solapa con otra selección.",
      );
      return;
    }

    setSelectedSlots((current) =>
      current
        .map((slot) =>
          slot.id === editingSlotId
            ? { ...slot, id: `${start.getTime()}`, start, end }
            : slot,
        )
        .sort((first, second) => first.start.getTime() - second.start.getTime()),
    );
    setEditingSlotId(null);
    setError("");
  }

  if (!schedule) {
    return (
      <main className={styles.page}>
        <p className={error ? styles.error : styles.muted}>
          {error || "Cargando calendario..."}
        </p>
      </main>
    );
  }

  const blockedEvents: EventInput[] = [
    ...schedule.unavailability,
    ...schedule.classes,
  ].map((item) => ({
    id: item.id,
    title: "No disponible",
    start: item.startAt,
    end: item.endAt,
    className: styles.blockedEvent,
  }));
  const selectedEvents: EventInput[] = selectedSlots.map((slot) => ({
    id: slot.id,
    title: "Seleccionado",
    start: slot.start,
    end: slot.end,
    className: styles.selectedEvent,
  }));
  const timezone = schedule.timezone || DEFAULT_TIMEZONE;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Clases de programación</p>
        <h1>Agenda una clase con {schedule.name}</h1>
        <p className={styles.description}>
          Selecciona un intervalo libre de 60 minutos. Las horas disponibles
          pueden comenzar en cualquier minuto.
        </p>
      </header>
      <section className={styles.card}>
        {error && (
          <p ref={noticeRef} className={styles.noticeError} role="alert">
            {error}
          </p>
        )}
        {submitted && (
          <p ref={noticeRef} className={styles.noticeSuccess} role="status">
            Solicitud enviada. Quedará pendiente hasta que la profesora la
            apruebe.
            <br />
            Guarda tu código de seguimiento:{" "}
            <strong>{trackingTokens.join(", ")}</strong>
          </p>
        )}
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.eyebrow}>Calendario público</p>
            <h2>Elige una hora</h2>
          </div>
          <span className={styles.timezone}>{schedule.timezone}</span>
        </div>
        <div className={styles.calendar}>
          <FullCalendar
            key={isMobile ? "mobile-calendar" : "desktop-calendar"}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: isMobile
                ? "dayGridMonth,timeGridWeek,timeGridDay"
                : "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            locale="es"
            firstDay={1}
            allDaySlot={false}
            selectable={!isMobile}
            selectMirror={!isMobile}
            select={!isMobile ? handleSelect : undefined}
            dateClick={isMobile ? handleDateClick : undefined}
            selectOverlap={false}
            slotMinTime="08:00:00"
            slotMaxTime="23:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            snapDuration="00:01:00"
            validRange={{ start: today }}
            businessHours={[
              { daysOfWeek: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "19:30" },
              { daysOfWeek: [0, 6], startTime: "10:00", endTime: "23:00" },
            ]}
            selectAllow={(selection) => {
              const startWindow = getScheduleWindow(selection.start, timezone);
              const endWindow = getScheduleWindow(selection.end, timezone);
              const startMinutes =
                selection.start.getHours() * 60 + selection.start.getMinutes();
              const endMinutes =
                selection.end.getHours() * 60 + selection.end.getMinutes();
              return (
                startWindow.startHour * 60 + startWindow.startMinute <=
                  startMinutes &&
                endWindow.endHour * 60 + endWindow.endMinute >= endMinutes &&
                startWindow.startHour === endWindow.startHour
              );
            }}
            height="620px"
            expandRows
            events={[...blockedEvents, ...selectedEvents]}
            eventDisplay="block"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
          />
        </div>
        {isMobile && (
          <p className={styles.mobileHint}>
            Toca una hora para seleccionarla. Para agregar otra, usa
            &quot;Agregar otro horario&quot;.
          </p>
        )}
        {selectedSlots.length > 0 && (
          <div className={styles.selection}>
            <div className={styles.selectionHeading}>
              <strong>Horarios seleccionados ({selectedSlots.length})</strong>
              {isMobile && (
                <button
                  type="button"
                  className={styles.addSlotButton}
                  onClick={() => {
                    allowAdditionalMobileSlotRef.current = true;
                  }}
                >
                  Agregar otro horario
                </button>
              )}
            </div>
            <ul className={styles.selectedList}>
              {selectedSlots.map((slot) => (
                <li key={slot.id}>
                  <span>{formatSelection(slot.start, slot.end)}</span>
                  <div className={styles.slotActions}>
                    <button type="button" onClick={() => beginEdit(slot)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlots((current) =>
                          current.filter((item) => item.id !== slot.id),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {editingSlotId && (
              <div className={styles.slotEditor}>
                <label>
                  Día
                  <input
                    type="date"
                    value={editingDate}
                    onChange={(event) => setEditingDate(event.target.value)}
                  />
                </label>
                <label>
                  Hora de inicio
                  <input
                    type="time"
                    value={editingTime}
                    onChange={(event) => setEditingTime(event.target.value)}
                  />
                </label>
                <p>El término se calculará automáticamente 60 minutos después.</p>
                <div className={styles.slotActions}>
                  <button type="button" onClick={saveEdit}>
                    Guardar horario
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSlotId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <form className={styles.requestForm} onSubmit={handleRequest}>
              <label>
                Tu nombre
                <input name="studentName" required maxLength={100} />
              </label>
              <label className={styles.phoneLabel}>
                Tu teléfono
                <span className={styles.phoneFields}>
                  <select name="countryCode" defaultValue="+56" aria-label="Código de país">
                    {PHONE_CODES.map(([code, country]) => (
                      <option key={code} value={code}>
                        {code} ({country})
                      </option>
                    ))}
                  </select>
                  <input
                    name="studentPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9 1234 5678"
                    required
                  />
                </span>
              </label>
              <label>
                Comentario (opcional)
                <textarea name="comment" maxLength={500} rows={3} />
              </label>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedSlots.length === 0
                }
              >
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </form>
          </div>
        )}
      </section>
      <section className={styles.statusCard}>
        <p className={styles.eyebrow}>Seguimiento</p>
        <h2>Consulta tu solicitud</h2>
        <p className={styles.statusDescription}>
          Usa el código que recibiste al enviarla.
        </p>
        <form className={styles.statusForm} onSubmit={checkRequestStatus}>
          <label>
            Código de seguimiento
            <input
              value={trackingToken}
              onChange={(event) => setTrackingToken(event.target.value)}
              required
              spellCheck={false}
            />
          </label>
          <button type="submit" disabled={isCheckingStatus}>
            {isCheckingStatus ? "Consultando..." : "Consultar estado"}
          </button>
        </form>
        {requestStatus && (
          <div className={styles.statusResult} role="status">
            <strong>{statusLabel(requestStatus)}</strong>
            <span>
              {formatSelection(
                new Date(requestStatus.requestedStart),
                new Date(requestStatus.requestedEnd),
              )}
            </span>
            {requestStatus.rejectionReason && (
              <span>Motivo: {requestStatus.rejectionReason}</span>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
