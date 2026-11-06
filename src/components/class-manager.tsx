"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./class-manager.module.css";

type ConfirmedClass = {
  id: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string | null;
  startAt: string;
  endAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function fieldDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function fieldTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

export function ClassManager() {
  const [classes, setClasses] = useState<ConfirmedClass[]>([]);
  const [editing, setEditing] = useState<ConfirmedClass | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    const response = await fetch("/api/teacher-schedule");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No se pudieron cargar las clases.");
      setIsLoading(false);
      return;
    }
    setClasses(data.classes);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClasses(), 0);
    const refresh = () => void loadClasses();
    window.addEventListener("schedule-changed", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("schedule-changed", refresh);
    };
  }, [loadClasses]);

  function startEditing(item: ConfirmedClass) {
    setEditing(item);
    setDate(fieldDate(item.startAt));
    setTime(fieldTime(item.startAt));
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setIsSaving(true);
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + 60 * 60_000);
    try {
      const response = await fetch(`/api/classes/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo editar la clase.");
        return;
      }
      setEditing(null);
      await loadClasses();
      window.dispatchEvent(new Event("schedule-changed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function cancel(item: ConfirmedClass) {
    if (!window.confirm(`¿Cancelar la clase de ${item.studentName}?`)) return;
    setCancellingId(item.id);
    try {
      const response = await fetch(`/api/classes/${item.id}`, { method: "DELETE" });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo cancelar la clase.");
        return;
      }
      await loadClasses();
      window.dispatchEvent(new Event("schedule-changed"));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className={styles.card}>
      <p className={styles.eyebrow}>Clases confirmadas</p>
      <h2>Agenda administrada</h2>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading ? (
        <p className={styles.muted}>Cargando clases...</p>
      ) : classes.length === 0 ? (
        <p className={styles.muted}>No hay clases confirmadas.</p>
      ) : (
        <ul className={styles.list}>
          {classes.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.studentName}</strong>
                <span>{item.studentPhone || item.studentEmail}</span>
                <span>{formatDate(item.startAt)} - {fieldTime(item.endAt)}</span>
              </div>
              <div className={styles.actions}>
                <button type="button" disabled={Boolean(cancellingId)} onClick={() => startEditing(item)}>Editar</button>
                <button type="button" className={styles.cancel} disabled={Boolean(cancellingId)} onClick={() => void cancel(item)}>
                  {cancellingId === item.id ? "Cancelando..." : "Cancelar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className={styles.editor}>
          <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Inicio<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          <p>La clase conservará una duración de 60 minutos.</p>
          <div className={styles.actions}>
            <button type="button" disabled={isSaving} onClick={() => void saveEdit()}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className={styles.cancel} onClick={() => setEditing(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </section>
  );
}
