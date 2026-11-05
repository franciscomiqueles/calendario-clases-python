"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./request-manager.module.css";

type BookingRequest = {
  id: string;
  studentName: string;
  studentEmail: string;
  requestedStart: string;
  requestedEnd: string;
  comment: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

export function RequestManager() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [history, setHistory] = useState<BookingRequest[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(
    null,
  );
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null,
  );

  const loadRequests = useCallback(async () => {
    const [pendingResponse, historyResponse] = await Promise.all([
      fetch("/api/booking-requests/pending"),
      fetch("/api/booking-requests/history"),
    ]);
    const pendingData = await pendingResponse.json();
    const historyData = await historyResponse.json();

    if (!pendingResponse.ok || !historyResponse.ok) {
      setError(
        pendingData.error ??
          historyData.error ??
          "No se pudieron cargar las solicitudes.",
      );
    } else {
      setRequests(pendingData);
      setHistory(historyData);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function updateRequest(id: string, action: "accept" | "reject") {
    setUpdatingRequestId(id);
    try {
      const response = await fetch(`/api/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar la solicitud.");
        return;
      }

      await loadRequests();
      setSuccess(action === "accept" ? "Solicitud aceptada." : "Solicitud rechazada.");
      window.dispatchEvent(new Event("schedule-changed"));
    } finally {
      setUpdatingRequestId(null);
    }
  }

  async function deleteRequest(request: BookingRequest) {
    if (
      !window.confirm(
        `¿Eliminar la solicitud rechazada de ${request.studentName}?`,
      )
    ) {
      return;
    }

    setDeletingRequestId(request.id);
    try {
      const response = await fetch(`/api/booking-requests/${request.id}`, {
        method: "DELETE",
      });
      const data = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        setError(data?.error ?? "No se pudo eliminar la solicitud.");
        return;
      }

      await loadRequests();
      setSuccess("Solicitud eliminada.");
    } finally {
      setDeletingRequestId(null);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Solicitudes</p>
          <h2>Pendientes de aprobación</h2>
        </div>
        <span className={styles.count}>{requests.length}</span>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      {isLoading ? (
        <p className={styles.muted}>Cargando solicitudes...</p>
      ) : requests.length === 0 ? (
        <p className={styles.muted}>No hay solicitudes pendientes.</p>
      ) : (
        <ul className={styles.list}>
          {requests.map((request) => (
            <li key={request.id}>
              <div>
                <strong>{request.studentName}</strong>
                <span>{request.studentEmail}</span>
                <span>
                  {formatDate(request.requestedStart)} -{" "}
                  {new Intl.DateTimeFormat("es-CL", {
                    timeStyle: "short",
                    timeZone: "America/Santiago",
                  }).format(new Date(request.requestedEnd))}
                </span>
                {request.comment && <small>{request.comment}</small>}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={updatingRequestId === request.id}
                  onClick={() => void updateRequest(request.id, "accept")}
                >
                  {updatingRequestId === request.id ? "Guardando..." : "Aceptar"}
                </button>
                <button
                  type="button"
                  className={styles.reject}
                  disabled={updatingRequestId === request.id}
                  onClick={() => void updateRequest(request.id, "reject")}
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && (
        <details className={styles.history}>
          <summary className={styles.historyHeading}>
            <h3>Historial</h3>
            <span className={styles.historyCount}>{history.length}</span>
          </summary>
          {history.length === 0 ? (
            <p className={styles.muted}>Aún no hay solicitudes gestionadas.</p>
          ) : (
            <ul className={styles.list}>
              {history.map((request) => (
                <li key={request.id}>
                  <div>
                    <strong>{request.studentName}</strong>
                    <span>{request.studentEmail}</span>
                    <span>
                      {formatDate(request.requestedStart)} -{" "}
                      {new Intl.DateTimeFormat("es-CL", {
                        timeStyle: "short",
                        timeZone: "America/Santiago",
                      }).format(new Date(request.requestedEnd))}
                    </span>
                    {request.rejectionReason && (
                      <small>Motivo: {request.rejectionReason}</small>
                    )}
                  </div>
                  <span
                    className={
                      request.status === "ACCEPTED"
                        ? styles.accepted
                        : styles.rejected
                    }
                  >
                    {request.status === "ACCEPTED" ? "Aceptada" : "Rechazada"}
                  </span>
                  {request.status === "REJECTED" && (
                    <button
                      type="button"
                      className={styles.delete}
                      disabled={deletingRequestId === request.id}
                      onClick={() => void deleteRequest(request)}
                    >
                      {deletingRequestId === request.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </section>
  );
}
