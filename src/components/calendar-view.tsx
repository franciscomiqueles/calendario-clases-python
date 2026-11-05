"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventInput } from "@fullcalendar/core";

import styles from "./calendar-view.module.css";

type Unavailability = {
  id: string;
  startAt: string;
  endAt: string;
};

type TeacherSchedule = {
  unavailability: Unavailability[];
  classes: Array<{
    id: string;
    studentName: string;
    startAt: string;
    endAt: string;
  }>;
};

export function CalendarView() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/teacher-schedule");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo cargar el calendario.");
      return;
    }

    const schedule = data as TeacherSchedule;
    setEvents([
      ...schedule.unavailability.map((item) => ({
        id: item.id,
        title: "No disponible",
        start: item.startAt,
        end: item.endAt,
        className: styles.unavailableEvent,
      })),
      ...schedule.classes.map((item) => ({
        id: `class-${item.id}`,
        title: `Clase: ${item.studentName}`,
        start: item.startAt,
        end: item.endAt,
        className: styles.confirmedEvent,
      })),
    ]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 0);
    const refresh = () => void loadEvents();
    window.addEventListener("schedule-changed", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("schedule-changed", refresh);
    };
  }, [loadEvents]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Vista de agenda</p>
          <h2>Horario y bloqueos</h2>
        </div>
        <span className={styles.legend}>
          <span className={styles.legendDot} /> No disponible
        </span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.calendar}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale="es"
          firstDay={1}
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          businessHours={[
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "19:30" },
            { daysOfWeek: [0, 6], startTime: "10:00", endTime: "23:00" },
          ]}
          height="620px"
          expandRows
          events={events}
          eventDisplay="block"
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
        />
      </div>
    </section>
  );
}
