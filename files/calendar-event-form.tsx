"use client";

// Replacement for CalendarKit's built-in edit card.
//
// The library's card offers Location, Guests, Reminders and Description,
// none of which exist on a generated Grit resource. This form renders only
// the resource fields listed in config/calendar.ts under editing.fields, and
// hides Delete unless editing.canDelete is true.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { EventEditorProps, Resource } from "calendarkit-pro";

import type { CalendarDefinition } from "@/config/calendar";
import {
  fromInputValue,
  toInputValue,
  type Mapping,
} from "@/components/calendar/calendar-data";

interface Props extends EventEditorProps {
  settings: CalendarDefinition;
  mapping: Mapping;
  lanes: Resource[];
}

export function CalendarEventForm({
  isOpen,
  onClose,
  event,
  onSave,
  onDelete,
  settings,
  mapping,
  lanes,
}: Props) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lane, setLane] = useState("");

  // Re-seed the fields every time the dialog opens for a different event.
  useEffect(() => {
    if (!isOpen || !event) return;
    setTitle(event.title);
    setStart(toInputValue(event.start, settings));
    setEnd(toInputValue(event.end, settings));
    setLane(event.resourceId ?? "");
  }, [isOpen, event, settings]);

  // CalendarKit's stylesheet is unlayered, so inside .ck-root it beats every
  // Tailwind utility in @layer utilities: buttons turn transparent, borders
  // disappear and the card loses its padding. Portalling to body escapes that
  // scope completely and keeps the admin's own theme tokens.
  if (!isOpen || !event || typeof document === "undefined") return null;

  const allowed = (field: string) =>
    settings.editing.canEdit && settings.editing.fields.includes(field);
  const showTitle = allowed(settings.event.titleField);
  const showStart = allowed(settings.event.startField);
  const showEnd = allowed(settings.event.endField);
  const showLane = allowed(settings.lane.foreignKey);
  const anyField = showTitle || showStart || showEnd || showLane;

  const save = () => {
    const update: Record<string, unknown> = {};
    if (showTitle) update.title = title;
    if (showStart) update.start = fromInputValue(start, settings);
    if (showEnd) update.end = fromInputValue(end, settings);
    if (showLane) update.resourceId = lane || undefined;
    if (Object.keys(update).length) onSave(update);
    onClose();
  };

  const remove = () => {
    if (!settings.editing.canDelete || !onDelete) return;
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    onDelete(event.id);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit event"
        className="w-full max-w-md rounded-lg border border-border bg-bg-elevated p-5 text-foreground shadow-lg"
      >
        <h2 className="mb-4 text-lg font-semibold">Edit event</h2>

        {!anyField && (
          <p className="mb-4 text-sm text-text-muted">
            No fields are editable for this calendar. Change editing.fields in
            config/calendar.ts.
          </p>
        )}

        <div className="space-y-4">
          {showTitle && (
            <label className="block text-sm">
              <span className="mb-1 block text-text-muted">Title</span>
              <input
                className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}

          {showStart && (
            <label className="block text-sm">
              <span className="mb-1 block text-text-muted">Start</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
          )}

          {showEnd && (
            <label className="block text-sm">
              <span className="mb-1 block text-text-muted">End</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          )}

          {showLane && (
            <label className="block text-sm">
              <span className="mb-1 block text-text-muted">Row</span>
              <select
                className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2"
                value={lane}
                onChange={(e) => setLane(e.target.value)}
              >
                <option value="">None</option>
                {lanes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {settings.editing.canDelete && (
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm text-danger hover:bg-bg-hover"
                onClick={remove}
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-bg-hover"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm text-accent-fg hover:bg-accent-hover"
              onClick={save}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
