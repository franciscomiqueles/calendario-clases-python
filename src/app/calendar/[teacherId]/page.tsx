import { Suspense } from "react";

import { PublicCalendar } from "@/components/public-calendar";

type CalendarPageProps = {
  params: Promise<{ teacherId: string }>;
};

async function CalendarContent({ params }: CalendarPageProps) {
  const { teacherId } = await params;

  return <PublicCalendar teacherId={teacherId} />;
}

export default function CalendarPage({ params }: CalendarPageProps) {
  return (
    <Suspense fallback={<main>Cargando calendario...</main>}>
      <CalendarContent params={params} />
    </Suspense>
  );
}
