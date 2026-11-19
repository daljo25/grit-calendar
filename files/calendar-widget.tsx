"use client";

// Dashboard widget for grit-calendar. Enabled and tuned from config/calendar.ts.
// It shows the next few events so the calendar is reachable without leaving the
// dashboard, and never renders at all when widget.enabled is false.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "calendarkit-pro";

import { CALENDAR_CONFIG } from "@/config/calendar";
import {
  detailHref,
  formatTime,
  readRows,
  resolveMapping,
  toEvents,
  type Mapping,
} from "@/components/calendar/calendar-data";

interface Upcoming {
  event: CalendarEvent;
  laneLabel: string;
}

export function CalendarWidget() {
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [laneLabels, setLaneLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!CALENDAR_CONFIG.widget.enabled) return;
    const found = resolveMapping();
    if (!found) return;
    setMapping(found);
    Promise.all([readRows(found.eventResource), readRows(found.laneResource)])
      .then(([eventRows, laneRows]) => {
        const labels: Record<string, string> = {};
        for (const row of laneRows)
          labels[String(row.id)] = String(row[found.laneLabelField] ?? `Row ${row.id}`);
        setLaneLabels(labels);
        setEvents(toEvents(eventRows, found));
      })
      .catch(() => setEvents([]));
  }, []);

  const upcoming = useMemo<Upcoming[]>(() => {
    const now = Date.now();
    const limit = now + 30 * 24 * 3600 * 1000;
    return events
      .filter((event) => event.start.getTime() >= now && event.start.getTime() <= limit)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, CALENDAR_CONFIG.widget.max)
      .map((event) => ({
        event,
        laneLabel: event.resourceId ? laneLabels[event.resourceId] || "" : "",
      }));
  }, [events, laneLabels]);

  if (!CALENDAR_CONFIG.widget.enabled || !mapping || !upcoming.length) return null;

  return (
    <div className="mt-8 rounded-lg border border-border bg-bg-secondary p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {CALENDAR_CONFIG.widget.title}
        </h2>
        <Link
          href={CALENDAR_CONFIG.nav.href}
          className="text-xs text-accent hover:underline"
        >
          Open calendar
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {upcoming.map(({ event, laneLabel }) => (
          <li key={event.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-12 shrink-0 font-mono text-xs text-muted">
              {formatTime(event.start)}
            </span>
            <a
              href={detailHref(mapping, event.id)}
              className="flex-1 truncate text-foreground hover:text-accent"
            >
              {event.title}
            </a>
            {laneLabel && (
              <span className="max-w-[10rem] truncate text-xs text-muted">{laneLabel}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
