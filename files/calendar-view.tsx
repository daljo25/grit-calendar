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

  // CalendarKit reports the whole list after every edit, move, resize and
  // delete. Only changes to records we already have are persisted. Creation
  // from the quick card is out of scope for this version.
  const handleEventsChange = useCallback(
    (next: CalendarEvent[]) => {
      if (!mapping || !settings.editing.canEdit) return;
      const before = new Map(events.map((event) => [event.id, event]));
      const updates = next.flatMap((event) => {
        const previous = before.get(event.id);
        if (!previous) return [];
        const body = changedFields(event, previous, mapping);
        return Object.keys(body).length ? [{ id: event.id, body }] : [];
      });
      const removed = settings.editing.canDelete
        ? events.filter((event) => !next.some((item) => item.id === event.id))
        : [];

      if (updates.length) {
        setEventRows((rows) =>
          rows.map((row) => {
            const update = updates.find((u) => u.id === String(row.id));
            return update ? { ...row, ...update.body } : row;
          })
        );
      }
      if (removed.length) {
        const ids = new Set(removed.map((event) => event.id));
        setEventRows((rows) => rows.filter((row) => !ids.has(String(row.id))));
      }
      if (!updates.length && !removed.length) return;

      Promise.all([
        ...updates.map((u) => patchEvent(u.id, u.body, mapping)),
        ...removed.map((event) => deleteEvent(event.id, mapping)),
      ])
        .then(() =>
          queryClient.invalidateQueries({ queryKey: [mapping.eventResource.endpoint] })
        )
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "Could not save the change")
        );
    },
    [events, mapping, settings, queryClient]
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
          onEventsChange={handleEventsChange}
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
