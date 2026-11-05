import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { AvailabilityManager } from "@/components/availability-manager";
import { CalendarView } from "@/components/calendar-view";
import { RequestManager } from "@/components/request-manager";
import { ClassManager } from "@/components/class-manager";
import { SignOutButton } from "@/components/sign-out-button";
import styles from "./dashboard.module.css";

async function DashboardContent() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "48px 24px" }}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <p className={styles.eyebrow}>Panel privado</p>
          <h1>Hola, {session.user.name}</h1>
          <p>{session.user.email}</p>
        </div>
        <SignOutButton />
      </div>
      <p style={{ marginBottom: "24px" }}>
        Enlace público para tus alumnos:{" "}
        <a href={`/calendar/${session.user.id}`}>
          {`/calendar/${session.user.id}`}
        </a>
      </p>
      <CalendarView />
      <AvailabilityManager />
      <RequestManager />
      <ClassManager />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main style={{ padding: "48px" }}>Cargando...</main>}>
      <DashboardContent />
    </Suspense>
  );
}
