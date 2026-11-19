"use client";

// grit-calendar v0.1.0
//
// A resource calendar over two generated Grit resources. CalendarKit Pro
// supplies the views, drag and drop and the time grid; this file only turns
// generated records into events, and writes a move back through the API.
//
// Everything the project needs to know is in the config block below. When the
// slugs are left empty the page infers them from the admin's own resource
// registry: the first resource with a datetime field supplies the events, and
// the resource named by its first relationship-select supplies the rows.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scheduler,
  type CalendarEvent,
  type Resource,
  type ViewType,
} from "calendarkit-pro";

import { apiClient } from "@/lib/api-client";
import { resources } from "@/resources";
import type { ResourceDefinition } from "@/lib/resource";

type Mapping = {
  /** Resource whose records are the events. */
  eventSlug: string;
  /** Resource whose records are the rows (rooms, people, equipment). */
  laneSlug: string;
  titleField: string;
  startField: string;
  endField: string;
  /** Field on the event that points at a row. */
  laneField: string;
  /** Field on the row shown as its label. */
  laneLabelField: string;
};

const config: Mapping = {
  eventSlug: "",
  laneSlug: "",
  titleField: "title",
  startField: "starts_at",
  endField: "ends_at",
  laneField: "room_id",
  laneLabelField: "name",
};

type Row = Record<string, any> & { id: string };

function detectMapping(): Mapping | null {
  const event = resources.find((r) =>
    r.form?.fields?.some((f) => f.type === "datetime")
  );
  if (!event) return null;

  const start = event.form.fields.find((f) => f.type === "datetime");
  const relation = event.form.fields.find(
    (f) => f.type === "relationship-select" && f.relatedEndpoint
  );
  const lane = relation
    ? resources.find((r) => r.endpoint === relation.relatedEndpoint)
    : undefined;

  if (!start || !relation || !lane) return null;

  return {
    ...config,
    eventSlug: event.slug,
    laneSlug: lane.slug,
    startField: start.key,
    laneField: relation.key,
    laneLabelField: relation.displayField || "name",
  };
}

async function readRows(resource: ResourceDefinition | undefined): Promise<Row[]> {
  if (!resource) return [];
  const response = await apiClient.get(resource.endpoint, {
    params: { page_size: 500 },
  });
  const body = response.data;
  const rows = Array.isArray(body) ? body : body?.data;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CalendarPage() {
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [eventRows, setEventRows] = useState<Row[]>([]);
  const [laneRows, setLaneRows] = useState<Row[]>([]);
  const [view, setView] = useState<ViewType>("resource");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = config.eventSlug
      ? { ...config }
      : detectMapping();
    if (!found) {
      setError(
        "No resource with a datetime field and a relationship to another resource was found. Set eventSlug and laneSlug in the config at the top of this page."
      );
      setLoading(false);
      return;
    }
    setMapping(found);

    const eventResource = resources.find((r) => r.slug === found.eventSlug);
    const laneResource = resources.find((r) => r.slug === found.laneSlug);
    Promise.all([readRows(eventResource), readRows(laneResource)])
      .then(([events, lanes]) => {
        setEventRows(events);
        setLaneRows(lanes);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the calendar")
      )
      .finally(() => setLoading(false));
  }, []);

  const lanes = useMemo<Resource[]>(
    () =>
      laneRows.map((row) => ({
        id: String(row.id),
        label: String(row[mapping?.laneLabelField || "name"] ?? `Row ${row.id}`),
      })),
    [laneRows, mapping?.laneLabelField]
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!mapping) return [];
    return eventRows.flatMap((row) => {
      const start = asDate(row[mapping.startField]);
      if (!start) return [];
      const end = asDate(row[mapping.endField]) ?? new Date(start.getTime() + 3600000);
      const laneId = row[mapping.laneField];
      return [
        {
          id: String(row.id),
          title: String(row[mapping.titleField] ?? "Event"),
          start,
          end,
          resourceId: laneId == null ? undefined : String(laneId),
          draggable: laneId != null,
        },
      ];
    });
  }, [eventRows, mapping]);

  // A click opens the generated detail page for the record.
  const handleClick = useCallback(
    (event: CalendarEvent) => {
      if (!mapping) return;
      window.location.href = `/resources/${mapping.eventSlug}/view?id=${encodeURIComponent(event.id)}`;
    },
    [mapping]
  );

  // A drag writes the new time and row back through the resource's PATCH route.
  // Updating local state first keeps the calendar responsive; a failed write
  // reloads the rows so the calendar never shows a move that was not saved.
  const handleUpdate = useCallback(
    async (event: CalendarEvent) => {
      if (!mapping) return;
      const resource = resources.find((r) => r.slug === mapping.eventSlug);
      if (!resource) return;

      const moved = {
        [mapping.startField]: event.start.toISOString(),
        [mapping.endField]: event.end.toISOString(),
        [mapping.laneField]: event.resourceId,
      };
      setEventRows((prev) =>
        prev.map((row) => (String(row.id) === event.id ? { ...row, ...moved } : row))
      );
      try {
        await apiClient.patch(`${resource.endpoint}/${event.id}`, moved);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the move");
        const fresh = await readRows(resource).catch(() => null);
        if (fresh) setEventRows(fresh);
      }
    },
    [mapping]
  );

  if (error) {
    return <div className="p-6 text-sm text-danger">{error}</div>;
  }
  if (loading || !mapping) {
    return <div className="p-6 text-sm text-muted">Loading calendar</div>;
  }
  if (events.length === 0 && laneRows.length === 0) {
    return (
      <div className="p-6 text-sm text-muted">
        No {mapping.eventSlug} or {mapping.laneSlug} records yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-sm text-muted">
          Drag an event to another row to change its {mapping.laneField}. Click
          one to open the record.
        </p>
      </header>
      <div className="h-[720px] overflow-hidden rounded-lg border border-border">
        <Scheduler
          events={events}
          resources={lanes}
          view={view}
          onViewChange={setView}
          onEventClick={handleClick}
          onEventUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
