"use client";

// The calendar itself, shared by /calendar (the first entry in CALENDARS) and
// /calendar/<id> (every other entry). One implementation, so the two never
// drift in how they fetch, map or save events.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Scheduler, type CalendarEvent, type ViewType } from "calendarkit-pro";

import type { CalendarDefinition } from "@/config/calendar";
import {
  changedFields,
  deleteEvent,
  detailHref,
  patchEvent,
  readRows,
  resolveMapping,
  toEvents,
  toLanes,
  type Mapping,
  type Row,
} from "@/components/calendar/calendar-data";
import { CalendarEventForm } from "@/components/calendar/calendar-event-form";
import "@/components/calendar/calendar.css";

export function CalendarView({ settings }: { settings: CalendarDefinition }) {
  const queryClient = useQueryClient();
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [eventRows, setEventRows] = useState<Row[]>([]);
  const [laneRows, setLaneRows] = useState<Row[]>([]);
  const [view, setView] = useState<ViewType>("resource");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMapping(null);
    setEventRows([]);
    setLaneRows([]);
    setError("");
    setLoading(true);

    const found = resolveMapping(settings);
    if (!found) {
      setError(
        `No resources found for calendar "${settings.id}". Set event.slug and lane.slug in apps/admin/config/calendar.ts.`
      );
      setLoading(false);
      return;
    }
    setMapping(found);
    Promise.all([readRows(found.eventResource, settings), readRows(found.laneResource, settings)])
      .then(([events, lanes]) => {
        setEventRows(events);
        setLaneRows(lanes);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the calendar")
      )
      .finally(() => setLoading(false));
  }, [settings]);

  const events = useMemo(
    () => (mapping ? toEvents(eventRows, mapping) : []),
    [eventRows, mapping]
  );
  // CalendarKit may hand the same event object back after an edit. Cloning the
  // dates keeps our snapshot independent, so a move is still seen as a change.
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

  // The documented granular callbacks, rather than diffing the whole list:
  // CalendarKit calls onEventUpdate for form saves, drags and resizes, and
  // onEventDelete for deletes. Creation from the quick card is out of scope.
  const handleUpdate = useCallback(
    (next: CalendarEvent) => {
      if (!mapping || !settings.editing.canEdit) return;
      const previous = events.find((event) => event.id === next.id);
      if (!previous) return;
      const body = changedFields(next, previous, mapping);
      if (!Object.keys(body).length) return;

      setEventRows((rows) =>
        rows.map((row) =>
          String(row.id) === next.id ? { ...row, ...body } : row
        )
      );
      patchEvent(next.id, body, mapping)
        .then(() =>
          queryClient.invalidateQueries({ queryKey: [mapping.eventResource.endpoint] })
        )
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "Could not save the change")
        );
    },
    [events, mapping, settings, queryClient]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!mapping || !settings.editing.canDelete) return;
      setEventRows((rows) => rows.filter((row) => String(row.id) !== id));
      deleteEvent(id, mapping)
        .then(() =>
          queryClient.invalidateQueries({ queryKey: [mapping.eventResource.endpoint] })
        )
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "Could not delete the event")
        );
    },
    [mapping, settings, queryClient]
  );

  const handleClick = useCallback(
    (event: CalendarEvent) => {
      if (!mapping || settings.editing.openOnClick !== "detail") return;
      window.location.href = detailHref(mapping, event.id);
    },
    [mapping, settings]
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

  const theme =
    settings.theme === "grit" ? { preset: "calm" as const } : settings.theme;

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          {settings.nav.label}
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
          onEventUpdate={handleUpdate}
          onEventDelete={handleDelete}
          timezone={settings.timezone}
          theme={theme}
          readOnly={!settings.editing.canEdit}
          renderEventForm={
            settings.editing.canEdit
              ? (props) => (
                  <CalendarEventForm
                    {...props}
                    settings={settings}
                    mapping={mapping}
                    lanes={lanes}
                  />
                )
              : undefined
          }
          classNames={
            settings.theme === "grit" ? { root: "calendar-grit" } : undefined
          }
        />
      </div>
    </div>
  );
}
