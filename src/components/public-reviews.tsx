"use client";

import { FormEvent, useEffect, useState } from "react";

import styles from "./public-reviews.module.css";

type Review = {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  topic: string;
};

export function PublicReviews({ teacherId }: { teacherId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/reviews?teacherId=${encodeURIComponent(teacherId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las reseñas.");
        setReviews(data);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar las reseñas.");
      });
  }, [teacherId]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        studentName: form.get("studentName"),
        rating: form.get("rating"),
        comment: form.get("comment"),
        topic: form.get("topic"),
        website: form.get("website"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar la reseña.");
      return;
    }

    setSubmitted(true);
    formElement.reset();
  }

  return (
    <section className={styles.section} aria-labelledby="reviews-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Experiencias reales</p>
          <h2 id="reviews-title">Lo que dicen nuestros alumnos</h2>
        </div>
        <span className={styles.sticker}>★★★★★</span>
      </div>
      {reviews.length > 0 && (
        <div className={styles.list}>
          {reviews.map((review) => (
            <article className={styles.review} key={review.id}>
              <div className={styles.stars} aria-label={`${review.rating} de 5 estrellas`}>
                {"★".repeat(review.rating)}
              </div>
              <p>&ldquo;{review.comment}&rdquo;</p>
              <strong>{review.studentName || "Anónimo"}</strong>
              <span>{review.topic}</span>
            </article>
          ))}
        </div>
      )}
      <details className={styles.formCard}>
        <summary>Deja una reseña</summary>
        {submitted && <p className={styles.success}>Gracias. La reseña será revisada antes de publicarse.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <form onSubmit={submitReview}>
          <label>Tu nombre o iniciales (opcional)<input name="studentName" maxLength={80} /></label>
          <label>Curso o tema<input name="topic" required maxLength={120} /></label>
          <label>Calificación<select name="rating" defaultValue="5"><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select></label>
          <label>Tu comentario<textarea name="comment" required maxLength={800} rows={4} /></label>
          <label className={styles.consent}><input type="checkbox" required /> Acepto que mi reseña pueda publicarse.</label>
          <input className={styles.honeypot} name="website" tabIndex={-1} autoComplete="off" />
          <button type="submit">Enviar reseña</button>
        </form>
      </details>
    </section>
  );
}
