"use client";

// Replacement for CalendarKit's built-in edit card, built from the admin's
// own primitives: ResponsiveSheet, Input, Button and ConfirmModal. No custom
// colours, radii or spacing are introduced here.
//
// CalendarKit's stylesheet is unlayered and wins over Tailwind's layered
// utilities anywhere inside .ck-root, so the sheet is portalled to body. That
// is a containment fix, not a visual decision.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { EventEditorProps, Resource } from "calendarkit-pro";

import type { CalendarDefinition } from "@/config/calendar";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input, inputClasses } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
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
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Creating happens on the resource's own screen. CalendarKit opens this
    // form with no event when Create is clicked, so send the reader straight
    // there instead of showing a partial create sheet here.
    if (!event) {
      window.location.href = `/resources/${mapping.eventResource.slug}?action=create`;
      return;
    }
    setTitle(event.title);
    setStart(toInputValue(event.start, settings));
    setEnd(toInputValue(event.end, settings));
    setLane(event.resourceId ?? "");
    setConfirming(false);
  }, [isOpen, event, mapping, settings]);

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
    setConfirming(true);
  };

  return createPortal(
    <>
      <ResponsiveSheet
        open
        onClose={onClose}
        title="Edit event"
        size="sm"
        footer={
          <>
            {settings.editing.canDelete && (
              <Button variant="danger" onClick={remove}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!anyField && (
            <p className="text-sm text-text-secondary">
              No fields are editable for this calendar. Change editing.fields
              in config/calendar.ts.
            </p>
          )}

          {showTitle && (
            <div className="space-y-1.5">
              <label htmlFor="calendar-event-title" className="block text-sm font-medium text-foreground">
                Title
              </label>
              <Input
                id="calendar-event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}

          {showStart && (
            <div className="space-y-1.5">
              <label htmlFor="calendar-event-start" className="block text-sm font-medium text-foreground">
                Start
              </label>
              <Input
                id="calendar-event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
          )}

          {showEnd && (
            <div className="space-y-1.5">
              <label htmlFor="calendar-event-end" className="block text-sm font-medium text-foreground">
                End
              </label>
              <Input
                id="calendar-event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          )}

          {showLane && (
            <div className="space-y-1.5">
              <label htmlFor="calendar-event-lane" className="block text-sm font-medium text-foreground">
                Row
              </label>
              <select
                id="calendar-event-lane"
                className={inputClasses()}
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
            </div>
          )}
        </div>
      </ResponsiveSheet>

      <ConfirmModal
        open={confirming}
        variant="danger"
        title="Delete this event?"
        description={`${event.title} will be removed.`}
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDelete?.(event.id);
          onClose();
        }}
      />
    </>,
    document.body
  );
}
