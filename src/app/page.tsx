import Image from "next/image";

import styles from "./page.module.css";

export default function Home() {
  const publicCalendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Clases de programación</p>
          <h1>Aprende Python y Excel</h1>
        </div>
        <div className={styles.actions}>
          {publicCalendarUrl ? (
            <a className={styles.studentLink} href={publicCalendarUrl}>
              Agendar una clase
            </a>
          ) : (
            <p className={styles.setupNotice}>
              El enlace para agendar estará disponible próximamente.
            </p>
          )}
          <a className={styles.teacherLink} href="/login">
            Acceso de profesora
          </a>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.posterFrame}>
            <Image
              src="/afiche-clases.jpg"
              alt="Afiche de clases de programación de Annette"
              width={768}
              height={993}
              priority
              className={styles.poster}
            />
          </div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Clases particulares</p>
            <h2>Agenda una hora para aprender a tu ritmo</h2>
            <p className={styles.description}>
              Clases de Python y Excel, presenciales u online, con una
              metodología cercana y adaptada a tus objetivos.
            </p>
            <div className={styles.highlights}>
              <span>Python</span>
              <span>Excel</span>
              <span>Presencial y online</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
