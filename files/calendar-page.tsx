"use client";

// grit-calendar v0.2.0
//
// The full calendar page. All settings live in config/calendar.ts; the data
// layer shared with the dashboard widget lives in calendar-data.ts.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Scheduler, type CalendarEvent, type ViewType } from "calendarkit-pro";

import { CALENDAR_CONFIG } from "@/config/calendar";
import {
  changedFields,
  detailHref,
  patchEvent,
  readRows,
  resolveMapping,
  toEvents,
  toLanes,
  type Mapping,
  type Row,
} from "@/components/calendar/calendar-data";
import "@/components/calendar/calendar.css";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [eventRows, setEventRows] = useState<Row[]>([]);
  const [laneRows, setLaneRows] = useState<Row[]>([]);
  const [view, setView] = useState<ViewType>("resource");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = resolveMapping();
    if (!found) {
      setError(
        "No event resource was found. Set event.slug and lane.slug in apps/admin/config/calendar.ts."
      );
      setLoading(false);
      return;
    }
    setMapping(found);
    Promise.all([readRows(found.eventResource), readRows(found.laneResource)])
      .then(([events, lanes]) => {
        setEventRows(events);
        setLaneRows(lanes);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the calendar")
      )
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(
    () => (mapping ? toEvents(eventRows, mapping) : []),
    [eventRows, mapping]
  );
  // CalendarKit may hand the same event object back after an edit. Cloning the
  // dates keeps our snapshot independent, so a move is still detected as a
  // difference and written to the API.
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    [events]
  );
  const lanes = useMemo(
    () => (mapping ? toLanes(laneRows, mapping) : []),
    [laneRows, mapping]
  );

  // CalendarKit reports the whole list after every edit, move, resize and undo.
  // We persist only changes to records we already have. Creating and deleting
  // from the calendar is deliberately out of scope for this version.
  const handleEventsChange = useCallback(
    (next: CalendarEvent[]) => {
      if (!mapping) return;
      const before = new Map(events.map((event) => [event.id, event]));
      const updates = next.flatMap((event) => {
        const previous = before.get(event.id);
        if (!previous) return [];
        const body = changedFields(event, previous, mapping);
        return Object.keys(body).length ? [{ id: event.id, body }] : [];
      });
      if (!updates.length) return;

      setEventRows((rows) =>
        rows.map((row) => {
          const update = updates.find((u) => u.id === String(row.id));
          return update ? { ...row, ...update.body } : row;
        })
      );
      Promise.all(updates.map((u) => patchEvent(u.id, u.body, mapping)))
        .then(() =>
          queryClient.invalidateQueries({ queryKey: [mapping.eventResource.endpoint] })
        )
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "Could not save the change")
        );
    },
    [events, mapping, queryClient]
  );

  const handleClick = useCallback(
    (event: CalendarEvent) => {
      if (!mapping) return;
      window.location.href = detailHref(mapping, event.id);
    },
    [mapping]
  );

  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;
  if (loading || !mapping)
    return <div className="p-6 text-sm text-muted">Loading calendar</div>;
  if (!events.length && !lanes.length)
    return (
      <div className="p-6 text-sm text-muted">
        No {mapping.eventResource.slug} or {mapping.laneResource.slug} records yet.
      </div>
    );

  // "grit" keeps CalendarKit's neutral preset and lets calendar.css map its
  // --ck-* variables onto the admin's theme tokens. The other values are
  // CalendarKit's own presets.
  const theme =
    CALENDAR_CONFIG.theme === "grit"
      ? { preset: "calm" as const }
      : CALENDAR_CONFIG.theme;

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          {CALENDAR_CONFIG.nav.label}
        </h1>
        <p className="text-sm text-muted">
          Click an event to open its record. Drag it to another row or time to
          change {mapping.laneField} and the dates.
        </p>
      </header>
      <div className="h-[720px] overflow-hidden rounded-lg border border-border">
        <Scheduler
          events={calendarEvents}
          resources={lanes}
          view={view}
          onViewChange={setView}
          onEventClick={handleClick}
          onEventsChange={handleEventsChange}
          timezone={CALENDAR_CONFIG.timezone}
          theme={theme}
          classNames={
            CALENDAR_CONFIG.theme === "grit" ? { root: "calendar-grit" } : undefined
          }
        />
      </div>
    </div>
  );
}
