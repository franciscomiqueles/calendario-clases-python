"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./request-manager.module.css";

type Review = {
  id: string;
  studentName: string | null;
  rating: number;
  comment: string;
  topic: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export function ReviewManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/reviews");
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "No se pudieron cargar las reseñas.");
    else setReviews(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function update(id: string, status: Review["status"]) {
    const response = await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "No se pudo actualizar la reseña.");
      return;
    }
    await load();
  }

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>Opiniones</p><h2>Reseñas de alumnos</h2></div>
        <span className={styles.count}>{reviews.filter((review) => review.status === "PENDING").length}</span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.list}>
        {reviews.map((review) => (
          <li key={review.id}>
            <div>
              <strong>{review.studentName || "Anónimo"} · {"★".repeat(review.rating)}</strong>
              <span>{review.topic}</span>
              <small>{review.comment}</small>
              <small>Estado: {review.status}</small>
            </div>
            <div className={styles.actions}>
              {review.status !== "APPROVED" && <button onClick={() => void update(review.id, "APPROVED")}>Aprobar</button>}
              {review.status !== "REJECTED" && <button className={styles.reject} onClick={() => void update(review.id, "REJECTED")}>Rechazar</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
