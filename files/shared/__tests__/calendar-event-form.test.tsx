// The edit sheet is built from Grit's primitives. These cover the field
// allowlist and the delete confirmation, the two behaviours that changed the
// most since the first release.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CALENDARS } from "../config/calendar";
import type { Mapping } from "../components/calendar/calendar-data";
import { CalendarEventForm } from "../components/calendar/calendar-event-form";

const mapping = {
  eventResource: { slug: "bookings" },
  laneResource: { slug: "lanes" },
  titleField: "title",
  startField: "starts_at",
  endField: "ends_at",
  laneField: "lane_id",
  laneLabelField: "name",
} as unknown as Mapping;

const event = {
  id: "01TEST",
  title: "Old title",
  start: new Date("2026-11-19T09:00:00Z"),
  end: new Date("2026-11-19T10:00:00Z"),
  resourceId: "lane-1",
};

function settingsWith(canDelete: boolean) {
  return {
    ...CALENDARS[0],
    editing: {
      ...CALENDARS[0].editing,
      canDelete,
      fields: ["title", "starts_at", "ends_at", "lane_id"],
    },
  };
}

function renderForm(canDelete: boolean, onSave = vi.fn(), onDelete = vi.fn()) {
  const onClose = vi.fn();
  render(
    <CalendarEventForm
      isOpen
      onClose={onClose}
      event={event}
      onSave={onSave}
      onDelete={onDelete}
      settings={settingsWith(canDelete)}
      mapping={mapping}
      lanes={[{ id: "lane-1", label: "Lane A" }]}
    />
  );
  return { onSave, onDelete, onClose };
}

describe("CalendarEventForm", () => {
  it("writes an edited title through onSave", async () => {
    const { onSave } = renderForm(false);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "New title");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ title: "New title" });
  });

  it("hides Delete when canDelete is false", () => {
    renderForm(false);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("confirms before calling onDelete when canDelete is true", async () => {
    const { onDelete } = renderForm(true);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete this event?")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    const buttons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("01TEST"));
  });
});
