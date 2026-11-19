/**
 * grit-calendar configuration.
 *
 * This is the file to edit after `grit plugin add calendar`. Everything the
 * plugin shows is driven from here: the two resources it reads, the sidebar
 * entry, the dashboard widget, the timezone and the theme. Edit a value, save,
 * and Next hot-reloads. Reinstalling the plugin is never needed.
 *
 * How the two resources fit together:
 *   event resource (appointments) -> lane resource (rooms)
 *   each event row carries a datetime and a field pointing at a lane row.
 *
 * Leave a slug empty to let the plugin infer it from the admin's own resource
 * registry: the first resource with a datetime field supplies the events, and
 * the resource named by that resource's first relationship-select supplies the
 * rows. An explicit slug that does not exist is an error on purpose, so a
 * typo does not silently fall back to a different resource.
 */

export type CalendarTheme = "grit" | "calm" | "vivid" | "editorial";

export interface CalendarSettings {
  nav: { label: string; iconKey: string; href: string };
  widget: { enabled: boolean; title: string; max: number };
  event: {
    slug: string;
    titleField: string;
    startField: string;
    endField: string;
    pageSize: number;
  };
  lane: { slug: string; labelField: string; foreignKey: string };
  timezone: string;
  theme: CalendarTheme;
}

export const CALENDAR_CONFIG: CalendarSettings = {
  // Sidebar entry. The plugin injects the CALENDAR_NAV object below into
  // CONTENT_NAV, so this is the only place to change label or link text.
  nav: {
    // Text shown in the admin rail. Free string.
    label: "Calendar",

    // Lucide icon name. It must already be registered in lib/icons.ts.
    // "CalendarDays" is injected there by the plugin. Any other name needs
    // adding to that file's import and icon map before it will render.
    iconKey: "CalendarDays",

    // URL of the calendar link. The plugin always writes its page to
    // app/(dashboard)/calendar/page.tsx, so changing this only moves the link.
    // Keep the two in sync or the sidebar points at a page that does not exist.
    href: "/calendar",
  },

  // Optional dashboard tile. Lists the next events inside a 30 day window,
  // sorted by start time, with a link to each record and to the full calendar.
  widget: {
    // true | false, default true. On false the component still mounts but
    // renders nothing. No files are added or removed when you flip this.
    enabled: true,

    // Heading of the tile on /dashboard. Free string.
    title: "Next appointments",

    // Maximum number of rows in the tile, positive integer. The window is
    // fixed at 30 days, so a small number here does not widen it.
    max: 5,
  },

  // The resource whose rows become calendar events.
  event: {
    // Resource slug from apps/admin/resources/<slug>/<slug>.ts.
    // "" means auto-detect: first resource with a datetime field.
    // An explicit value must match a real slug or the page shows an error.
    slug: "",

    // Field used as the event title. Must be a string on each row.
    // The generated CRUD uses "title" for a field declared as title:string.
    titleField: "title",

    // Field holding the start. Must be type "date" or "datetime" in the
    // resource definition. Dragging writes an ISO string back here.
    startField: "starts_at",

    // Optional field holding the end. When a row has no value, the calendar
    // draws a one hour event starting at startField.
    endField: "ends_at",

    // page_size sent to the resource list endpoint. Keep it above the number
    // of rows you expect to see. The API may cap it lower than this value.
    pageSize: 500,
  },

  // The resource whose rows become the horizontal lanes (rooms, people, gear).
  lane: {
    // Resource slug. "" means auto-detect: the resource named by the event's
    // first relationship-select (its relatedEndpoint). Explicit must exist.
    slug: "",

    // Field on the lane row used as its label. Falls back to "Row <id>" when
    // the row has no such value. With auto-detect, the relationship's
    // displayField wins over this value.
    labelField: "name",

    // Field on the event row pointing at a lane. In auto-detect this comes
    // from the relationship-select key. Dragging an event to another lane
    // writes the new id here through PATCH.
    foreignKey: "room_id",
  },

  // IANA timezone, e.g. "UTC", "Europe/Madrid", "America/New_York".
  // The seeders store UTC wall-clock times such as 09:00+00:00. UTC here
  // shows 09:00; Europe/Madrid would show 10:00 and write back 10:00 wall
  // time, which is a different stored instant. Default UTC avoids the shift.
  timezone: "UTC",

  // "grit" | "calm" | "vivid" | "editorial".
  // "grit" keeps CalendarKit's neutral preset and maps its --ck-* colours to
  // the admin's tokens, so the active Grit theme and dark mode are inherited.
  // The other three are CalendarKit's own presets and ignore Grit tokens.
  theme: "grit",
};

/**
 * Read by the sidebar injection, so editing nav.label or nav.iconKey above
 * changes the rail entry on the next render. Derived, not a second source.
 */
export const CALENDAR_NAV = {
  href: CALENDAR_CONFIG.nav.href,
  label: CALENDAR_CONFIG.nav.label,
  iconKey: CALENDAR_CONFIG.nav.iconKey,
};
