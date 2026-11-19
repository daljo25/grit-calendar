// Behaviour tests for the pure data helpers. The shell workflow covers
// install and removal; these cover the mapping, timezone and persistence
// rules that a grep cannot check.

import { describe, expect, it } from "vitest";

import {
  asDate,
  changedFields,
  detailHref,
  formatTime,
  fromInputValue,
  toEvents,
  toInputValue,
  type Mapping,
  type Row,
} from "../components/calendar/calendar-data";
import type { CalendarDefinition } from "../config/calendar";

const settings = {
  id: "appointments",
  timezone: "UTC",
  event: { slug: "appointments", titleField: "title", startField: "starts_at", endField: "ends_at" },
  lane: { slug: "rooms", labelField: "name", foreignKey: "room_id" },
} as unknown as CalendarDefinition;

const mapping = {
  eventResource: { slug: "appointments" },
  laneResource: { slug: "rooms" },
  titleField: "title",
  startField: "starts_at",
  endField: "ends_at",
  laneField: "room_id",
  laneLabelField: "name",
} as unknown as Mapping;

const row: Row = {
  id: "01TEST",
  title: "Reunión de equipo 13",
  starts_at: "2026-11-19T09:00:00+00:00",
  ends_at: "2026-11-19T10:30:00+00:00",
  room_id: "01ROOM",
};

describe("toEvents", () => {
  it("maps a generated row onto a CalendarKit event", () => {
    const [event] = toEvents([row], mapping);
    expect(event.title).toBe("Reunión de equipo 13");
    expect(event.resourceId).toBe("01ROOM");
    expect(event.start.toISOString()).toBe("2026-11-19T09:00:00.000Z");
    expect(event.end.toISOString()).toBe("2026-11-19T10:30:00.000Z");
  });

  it("draws a one hour event when the end field is empty", () => {
    const [event] = toEvents([{ ...row, ends_at: null }], mapping);
    expect(event.end.getTime() - event.start.getTime()).toBe(3600000);
  });

  it("skips rows without a usable start date", () => {
    expect(toEvents([{ ...row, starts_at: "not a date" }], mapping)).toHaveLength(0);
  });
});

describe("changedFields", () => {
  const previous = toEvents([row], mapping)[0];

  it("writes only the title when a title is edited", () => {
    const changed = changedFields({ ...previous, title: "Nuevo título" }, previous, mapping);
    expect(changed).toEqual({ title: "Nuevo título" });
  });

  it("writes date, end and row when an event is dragged", () => {
    const moved = {
      ...previous,
      start: new Date("2026-11-19T11:00:00Z"),
      end: new Date("2026-11-19T12:30:00Z"),
      resourceId: "02ROOM",
    };
    expect(changedFields(moved, previous, mapping)).toEqual({
      starts_at: "2026-11-19T11:00:00.000Z",
      ends_at: "2026-11-19T12:30:00.000Z",
      room_id: "02ROOM",
    });
  });

  it("writes nothing when nothing changed", () => {
    expect(changedFields({ ...previous }, previous, mapping)).toEqual({});
  });
});

describe("timezone", () => {
  it("keeps a UTC wall-clock time at 09:00", () => {
    const date = new Date("2026-11-19T09:00:00Z");
    expect(toInputValue(date, settings)).toBe("2026-11-19T09:00");
    expect(fromInputValue("2026-11-19T09:00", settings).toISOString()).toBe(
      "2026-11-19T09:00:00.000Z"
    );
    expect(formatTime(date, settings)).toContain("09:00");
  });
});

describe("links", () => {
  it("uses the generated detail route, not /view?id=", () => {
    expect(detailHref(mapping, "01TEST")).toBe("/resources/appointments/01TEST");
  });
});

describe("asDate", () => {
  it("rejects values that are not dates", () => {
    expect(asDate("not a date")).toBeNull();
    expect(asDate(null)).toBeNull();
  });
});
