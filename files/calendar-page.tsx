// The default calendar. The first entry in CALENDARS owns the /calendar URL,
// so existing bookmarks keep working when more calendars are added.

import { CALENDARS } from "@/config/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return <CalendarView settings={CALENDARS[0]} />;
}
