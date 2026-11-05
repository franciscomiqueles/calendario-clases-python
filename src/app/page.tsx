import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Calendario de clases</p>
          <h1>Agenda tus clases de Python</h1>
        </div>
        <a className={styles.status} href="/login">Acceso de profesora</a>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>Vista pública</p>
              <h2>Calendario público</h2>
            </div>
            <span className={styles.timezone}>America/Santiago</span>
          </div>
          <div className={styles.emptyState}>
            <div className={styles.calendarIcon} aria-hidden="true">
              15
            </div>
            <div>
              <h3>Usa el enlace público para agendar</h3>
              <p>
                Comparte el enlace de tu calendario con tus alumnos para que
                puedan seleccionar una hora y enviar una solicitud.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
