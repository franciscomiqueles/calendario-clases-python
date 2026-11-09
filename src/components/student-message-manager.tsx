"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import styles from "./request-manager.module.css";

type Message = { id: string; url: string; altText: string };

export function StudentMessageManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/student-messages?teacherId=dashboard");
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "No se pudieron cargar los mensajes.");
    else setMessages(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    const form = event.currentTarget;
    const response = await fetch("/api/student-messages", { method: "POST", body: new FormData(form) });
    const data = await response.json();
    setUploading(false);
    if (!response.ok) {
      setError(data.error ?? "No se pudo subir el screenshot.");
      return;
    }
    form.reset();
    setPreview("");
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/student-messages?id=${id}`, { method: "DELETE" });
    if (!response.ok) { setError("No se pudo eliminar el screenshot."); return; }
    await load();
  }

  return (
    <section className={styles.card}>
      <div className={styles.heading}><div><p className={styles.eyebrow}>Galería pública</p><h2>Mensajes de alumnos</h2></div><span className={styles.count}>{messages.length}</span></div>
      <p>Revisa que no aparezcan nombres, teléfonos ni otros datos personales antes de publicar.</p>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={upload}>
        <label>Screenshot<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setPreview(event.currentTarget.files?.[0] ? URL.createObjectURL(event.currentTarget.files[0]) : "")} /></label>
        <input name="altText" placeholder="Descripción pública de la imagen" maxLength={120} required />
        {preview && <img className={styles.preview} src={preview} alt="Vista previa del screenshot" />}
        <button type="submit" disabled={uploading}>{uploading ? "Subiendo..." : "Publicar mensaje"}</button>
      </form>
      <div className={styles.reviewImages}>
        {messages.map((message) => <span className={styles.reviewImage} key={message.id}><img src={message.url} alt={message.altText} width={180} /><button type="button" className={styles.delete} onClick={() => void remove(message.id)}>Eliminar</button></span>)}
      </div>
    </section>
  );
}
