"use client";

import { useEffect, useState } from "react";

import styles from "./public-student-messages.module.css";

type Message = { id: string; url: string; altText: string };

export function PublicStudentMessages({ teacherId }: { teacherId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    void fetch(`/api/student-messages?teacherId=${encodeURIComponent(teacherId)}`)
      .then((response) => response.json())
      .then(setMessages);
  }, [teacherId]);

  if (!messages.length) return null;

  return (
    <section className={styles.section} aria-labelledby="messages-title">
      <p className={styles.eyebrow}>Experiencias reales</p>
      <h2 id="messages-title">Mensajes de alumnos</h2>
      <div className={styles.grid}>
        {messages.map((message) => (
          <img key={message.id} src={message.url} alt={message.altText} />
        ))}
      </div>
    </section>
  );
}
