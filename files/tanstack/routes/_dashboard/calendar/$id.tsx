"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@/lib/next-compat";

import { CALENDARS } from "@/config/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

function CalendarByIdPage() {
  const { id } = useParams<{ id: string }>();
  const settings = CALENDARS.find((calendar) => calendar.id === id);

  if (!settings) {
    return (
      <div className="p-6 text-sm text-danger">
        Unknown calendar &quot;{id}&quot;. Add it in apps/admin/config/calendar.ts.
      </div>
    );
  }

  return <CalendarView settings={settings} />;
}

export const Route = createFileRoute("/_dashboard/calendar/$id")({
  component: CalendarByIdPage,
});
