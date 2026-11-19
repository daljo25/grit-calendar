"use client";

// Dashboard widget for grit-calendar. It shows the next events from every
// calendar whose widget.enabled is true, so one admin can serve admins and
// members from one feed. Enabled, titled and sized from config/calendar.ts.

import { Link } from "@/lib/next-compat";
import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "calendarkit-pro";

import { CALENDARS, CALENDAR_NAV, type CalendarDefinition } from "@/config/calendar";
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
  calendarLabel: string;
  href: string;
  mapping: Mapping;
  settings: CalendarDefinition;
}

export function CalendarWidget() {
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const active = CALENDARS.map((settings, index) => ({
      settings,
      nav: CALENDAR_NAV[index],
    })).filter((item) => item.settings.widget.enabled);
    if (!active.length) return;

    setTitle(active[0].settings.widget.title);
    Promise.all(
      active.map(async ({ settings, nav }) => {
        const mapping = resolveMapping(settings);
        if (!mapping) return [] as Upcoming[];
        const [eventRows, laneRows] = await Promise.all([
          readRows(mapping.eventResource, settings),
          readRows(mapping.laneResource, settings),
        ]);
        const labels: Record<string, string> = {};
        for (const row of laneRows)
          labels[String(row.id)] = String(row[mapping.laneLabelField] ?? `Row ${row.id}`);
        return toEvents(eventRows, mapping).map((event) => ({
          event,
          laneLabel: event.resourceId ? labels[event.resourceId] || "" : "",
          calendarLabel: nav.label,
          href: nav.href,
          mapping,
          settings,
        }));
      })
    )
      .then((groups) => groups.flat())
      .then((rows) => setUpcoming(rows))
      .catch(() => setUpcoming([]));
  }, []);

  const items = useMemo(() => {
    const now = Date.now();
    const limit = now + 30 * 24 * 3600 * 1000;
    const max = CALENDARS.find((c) => c.widget.enabled)?.widget.max ?? 5;
    return upcoming
      .filter((item) => item.event.start.getTime() >= now && item.event.start.getTime() <= limit)
      .sort((a, b) => a.event.start.getTime() - b.event.start.getTime())
      .slice(0, max);
  }, [upcoming]);

  if (!items.length || !title) return null;

  return (
    <div className="mt-8 rounded-lg border border-border bg-bg-secondary p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </h2>
        <Link href="/calendar" className="text-xs text-accent hover:underline">
          Open calendar
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {items.map(({ event, laneLabel, calendarLabel, href, mapping, settings }) => {
          return (
            <li key={`${calendarLabel}:${event.id}`} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted">
                {formatTime(event.start, settings)}
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
              <Link href={href} className="text-[11px] text-accent hover:underline">
                {calendarLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
