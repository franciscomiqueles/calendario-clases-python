"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import styles from "./availability-manager.module.css";

type Unavailability = {
  id: string;
  startAt: string;
  endAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

export function AvailabilityManager() {
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("19:30");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/unavailability");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo cargar la disponibilidad.");
    } else {
      setUnavailability(data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAvailability(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailability]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!date) {
      setError("Selecciona una fecha.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/unavailability/${editingId}` : "/api/unavailability",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: `${date}T${startTime}:00`,
            endAt: `${date}T${endTime}:00`,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la disponibilidad.");
      } else {
        setDate("");
        setEditingId(null);
        await loadAvailability();
        window.dispatchEvent(new Event("schedule-changed"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(item: Unavailability) {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt);
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    });

    setDate(dateFormatter.format(start));
    setStartTime(timeFormatter.format(start));
    setEndTime(timeFormatter.format(end));
    setEditingId(item.id);
    setError("");
  }

  async function removeAvailability(id: string) {
    if (!window.confirm("¿Eliminar esta ventana de disponibilidad?")) {
      return;
    }

    setError("");
    setDeletingId(id);
    try {
      const response = await fetch(`/api/unavailability/${id}`, {
        method: "DELETE",
      });
      const data = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        setError(data?.error ?? "No se pudo eliminar la disponibilidad.");
        return;
      }

      if (editingId === id) {
        setEditingId(null);
        setDate("");
      }
      await loadAvailability();
      window.dispatchEvent(new Event("schedule-changed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Nuevo bloqueo</p>
        <h2>{editingId ? "Editar bloqueo" : "Bloquear horario"}</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Fecha
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            Desde
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
          </label>
          <label>
            Hasta
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSaving}>
            {isSaving
              ? "Guardando..."
              : editingId
                ? "Guardar cambios"
                : "Agregar bloqueo"}
          </button>
          {editingId && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setEditingId(null);
                setDate("");
                setError("");
              }}
            >
              Cancelar edición
            </button>
          )}
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>

      <div className={styles.card}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Excepciones</p>
            <h2>Horarios no disponibles</h2>
          </div>
          <span className={styles.count}>{unavailability.length}</span>
        </div>
        {isLoading ? (
          <p className={styles.muted}>Cargando disponibilidad...</p>
        ) : unavailability.length === 0 ? (
          <p className={styles.muted}>No hay bloqueos. Todo el rango está disponible.</p>
        ) : (
          <ul className={styles.list}>
            {unavailability.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{formatDate(item.startAt)}</strong>
                  <span>
                    {formatTime(item.startAt)} - {formatTime(item.endAt)}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => startEditing(item)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={deletingId === item.id}
                    onClick={() => void removeAvailability(item.id)}
                  >
                    {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
