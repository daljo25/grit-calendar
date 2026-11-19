// Shared data layer for the calendar page and the dashboard widget.
//
// Both screens need the same four things: resolve which resources are the
// events and the rows, fetch them, turn them into CalendarKit shapes, and write
// a move back. Keeping that here means a change to the mapping applies to both
// instead of drifting between a page and a widget.

import { CALENDAR_CONFIG } from "@/config/calendar";
import { apiClient } from "@/lib/api-client";
import { resources } from "@/resources";
import type { ResourceDefinition } from "@/lib/resource";
import type { CalendarEvent, Resource } from "calendarkit-pro";

export type Row = Record<string, any> & { id: string };

export interface Mapping {
  eventResource: ResourceDefinition;
  laneResource: ResourceDefinition;
  titleField: string;
  startField: string;
  endField: string;
  laneField: string;
  laneLabelField: string;
}

/**
 * The configured resources, inferred from the admin's own registry when the
 * slugs are left empty. An explicit slug whose resource is missing is an error
 * rather than a guess: silent fallback hides a typo in config/calendar.ts.
 */
export function resolveMapping(): Mapping | null {
  const cfg = CALENDAR_CONFIG;
  const eventResource = cfg.event.slug
    ? resources.find((r) => r.slug === cfg.event.slug)
    : resources.find((r) =>
        r.form?.fields?.some((f) => f.type === "datetime")
      );
  if (!eventResource) return null;

  const startField = cfg.event.slug
    ? cfg.event.startField
    : eventResource.form.fields.find((f) => f.type === "datetime")?.key ?? cfg.event.startField;
  const relation = eventResource.form.fields.find(
    (f) => f.type === "relationship-select" && f.relatedEndpoint
  );

  const laneResource = cfg.lane.slug
    ? resources.find((r) => r.slug === cfg.lane.slug)
    : relation
      ? resources.find((r) => r.endpoint === relation.relatedEndpoint)
      : undefined;
  if (!laneResource) return null;

  return {
    eventResource,
    laneResource,
    titleField: cfg.event.titleField,
    startField,
    endField: cfg.event.endField,
    laneField: cfg.lane.slug ? cfg.lane.foreignKey : relation?.key ?? cfg.lane.foreignKey,
    laneLabelField: cfg.lane.slug
      ? cfg.lane.labelField
      : relation?.displayField || cfg.lane.labelField,
  };
}

export async function readRows(resource: ResourceDefinition): Promise<Row[]> {
  const response = await apiClient.get(resource.endpoint, {
    params: { page_size: CALENDAR_CONFIG.event.pageSize },
  });
  const body = response.data;
  const rows = Array.isArray(body) ? body : body?.data;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

export function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toEvents(rows: Row[], mapping: Mapping): CalendarEvent[] {
  return rows.flatMap((row) => {
    const start = asDate(row[mapping.startField]);
    if (!start) return [];
    const end =
      asDate(row[mapping.endField]) ?? new Date(start.getTime() + 3600000);
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
}

export function toLanes(rows: Row[], mapping: Mapping): Resource[] {
  return rows.map((row) => ({
    id: String(row.id),
    label: String(row[mapping.laneLabelField] ?? `Row ${row.id}`),
  }));
}

/** The fields of a CalendarKit event that differ from the stored row. */
export function changedFields(
  next: CalendarEvent,
  previous: CalendarEvent,
  mapping: Mapping
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (next.title !== previous.title) body[mapping.titleField] = next.title;
  if (next.start.getTime() !== previous.start.getTime())
    body[mapping.startField] = next.start.toISOString();
  if (next.end.getTime() !== previous.end.getTime())
    body[mapping.endField] = next.end.toISOString();
  if ((next.resourceId ?? "") !== (previous.resourceId ?? ""))
    body[mapping.laneField] = next.resourceId;
  return body;
}

/** PATCH one event. The API's generated PATCH route accepts a partial body. */
export function patchEvent(
  id: string,
  body: Record<string, unknown>,
  mapping: Mapping
): Promise<unknown> {
  return apiClient.patch(`${mapping.eventResource.endpoint}/${id}`, body);
}

/** A human time in the configured timezone, for the widget's list. */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CALENDAR_CONFIG.timezone,
  }).format(date);
}

export function detailHref(mapping: Mapping, id: string): string {
  return `/resources/${mapping.eventResource.slug}/${encodeURIComponent(id)}`;
}
