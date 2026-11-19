"use client";

// /calendar/<id> for every calendar after the first. The id is looked up in
// the same CALENDARS array the sidebar and the dashboard widget use, so a
// removed calendar has neither a link nor a page.

import { useParams } from "next/navigation";

import { CALENDARS } from "@/config/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarByIdPage() {
  const params = useParams<{ id: string }>();
  const settings = CALENDARS.find((calendar) => calendar.id === params.id);

  if (!settings) {
    return (
      <div className="p-6 text-sm text-danger">
        Unknown calendar &quot;{params.id}&quot;. Add it in apps/admin/config/calendar.ts.
      </div>
    );
  }

  return <CalendarView settings={settings} />;
}
