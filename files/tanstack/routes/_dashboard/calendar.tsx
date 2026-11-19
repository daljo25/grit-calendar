"use client";

// TanStack Router shim. The page component is shared with Next.js; only the
// routing wrapper differs between the two admin flavours.

import { createFileRoute } from "@tanstack/react-router";

import { CALENDARS } from "@/config/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export const Route = createFileRoute("/_dashboard/calendar")({
  component: () => <CalendarView settings={CALENDARS[0]} />,
});
