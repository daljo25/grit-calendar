// The URL bridge for ?action=create. These are the regressions that made
// v0.4.4 necessary: the URL was being ignored for the default sheet formView.

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock("@/lib/next-compat", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.params,
}));

import { CalendarCreateIntent } from "../components/calendar/calendar-create-intent";

describe("CalendarCreateIntent", () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.params = new URLSearchParams();
  });

  it("opens the resource's create sheet for the default formView", async () => {
    mocks.params = new URLSearchParams("action=create");
    const controller = { isFormPage: false, create: vi.fn() };

    render(<CalendarCreateIntent controller={controller} slug="bookings" />);

    await waitFor(() => expect(controller.create).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith("/resources/bookings");
  });

  it("leaves page formView resources to the framework", async () => {
    mocks.params = new URLSearchParams("action=create");
    const controller = { isFormPage: true, create: vi.fn() };

    render(<CalendarCreateIntent controller={controller} slug="bookings" />);

    await waitFor(() => expect(controller.create).not.toHaveBeenCalled());
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does nothing without the action parameter", async () => {
    const controller = { isFormPage: false, create: vi.fn() };

    render(<CalendarCreateIntent controller={controller} slug="bookings" />);

    await waitFor(() => expect(controller.create).not.toHaveBeenCalled());
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
