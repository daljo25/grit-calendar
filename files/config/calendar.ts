/**
 * grit-calendar configuration.
 *
 * This is the file to edit after `grit plugin add calendar`. Everything the
 * plugin shows is driven from here: the resources it reads, the sidebar
 * entries, the dashboard widget, the timezone, the theme and what a reader
 * may change from a calendar. Edit a value, save, and Next hot-reloads.
 * Reinstalling the plugin is never needed.
 *
 * CALENDARS is an array so the same plugin can serve more than one calendar:
 * for example one for admins and one for members, each reading its own pair
 * of resources. The first entry is the default and keeps the /calendar URL.
 * Every other entry is served at /calendar/<id>. The sidebar gets one link
 * per entry, so removing an entry from this array removes its link too.
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
export type CalendarClickAction = "detail" | "edit";

export interface CalendarDefinition {
  /** URL segment for this calendar: /calendar/<id>. The first one is /calendar. */
  id: string;
  nav: { label: string; iconKey: string; adminOnly: boolean; requires?: string; href?: string };
  widget: { enabled: boolean; title: string; max: number };
  event: {
    slug: string;
    titleField: string;
    startField: string;
    endField: string;
    pageSize: number;
  };
  lane: { slug: string; labelField: string; foreignKey: string };
  editing: { canEdit: boolean; canCreate: boolean; canDelete: boolean; fields: string[]; openOnClick: CalendarClickAction };
  timezone: string;
  theme: CalendarTheme;
}

export const CALENDARS: CalendarDefinition[] = [
  {
    // Unique id. Used as the URL segment /calendar/<id> for every calendar
    // after the first. Lowercase and hyphenated, like a resource slug.
    id: "appointments",

    // Sidebar entry for this calendar. Read by the nav injection, so this is
    // the only place to change label, icon and who sees the link.
    nav: {
      // Text shown in the admin rail. Free string.
      label: "Calendar",

      // Lucide icon name. It must already be registered in lib/icons.ts.
      // "CalendarDays" is injected there by the plugin. Any other name needs
      // adding to that file's import and icon map before it will render.
      iconKey: "CalendarDays",

      // Optional URL override for the first calendar. The plugin writes its
      // page at app/(dashboard)/calendar/page.tsx, so changing this only
      // moves the link. Leave undefined to use /calendar.
      href: undefined,

      // true hides the link from non-admins. The API still enforces access.
      adminOnly: false,

      // Optional permission, e.g. "appointments.view". The sidebar hides the
      // link for readers without it; the API is the real gate. Omit to show
      // the link to everybody who passes adminOnly.
      requires: undefined,
    },

    // Optional dashboard tile. Lists the next events inside a 30 day window,
    // sorted by start time, with a link to each record and to the full
    // calendar. Set enabled on more than one calendar to show a combined feed.
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

    // What a reader may change from this calendar. CalendarKit's own edit
    // card offers generic fields (Location, Guests, Reminders) that do not
    // exist on a generated resource, so this plugin replaces it with a form
    // built from `fields` below. Only the listed resource fields appear.
    editing: {
      // true | false, default true. On false this calendar is read only: no
      // edit form, no drag and no delete. The record page still edits every
      // field.
      canEdit: true,

      // true | false, default false. Hides CalendarKit's floating Create
      // button. On true a quick create writes a new row through POST with the
      // same field mapping below. The record page always creates rows too.
      canCreate: false,

      // true | false, default false. Adds a Delete button to the edit form.
      // On false the button is absent. On true a confirmation is required and
      // the row is removed with DELETE after you confirm.
      canDelete: false,

      // Resource field keys the edit form is allowed to change. Values can be
      // event.titleField, event.startField, event.endField and lane.foreignKey.
      // Any other string is ignored. Defaults to date, time and row for the
      // generated Room/Appointment example. Add "title" to edit the name here.
      // Keep in sync if you rename a field above.
      fields: ["starts_at", "ends_at", "room_id"],

      // "detail" | "edit", default "detail". Clicking an event either opens
      // its generated record page or opens the edit form above. Dragging is
      // unaffected: it always writes date and row when canEdit is on.
      openOnClick: "detail",
    },

    // IANA timezone, e.g. "UTC", "Europe/Madrid", "America/New_York".
    // The seeders store UTC wall-clock times such as 09:00+00:00. UTC here
    // shows 09:00; Europe/Madrid would show 10:00 and write back 10:00 wall
    // time, which is a different stored instant. Default UTC avoids the shift.
    // The edit form reads and writes wall-clock time in this same zone.
    timezone: "UTC",

    // "grit" | "calm" | "vivid" | "editorial".
    // "grit" keeps CalendarKit's neutral preset and maps its --ck-* colours
    // to the admin's tokens, so the active Grit theme and dark mode apply.
    // The other three are CalendarKit's own presets and ignore Grit tokens.
    theme: "grit",
  },
];

/** The default calendar, used by the widget when it is not given an id. */
export const CALENDAR_CONFIG = CALENDARS[0];

/** Read by the sidebar injection. Derived from CALENDARS, not a second source. */
export const CALENDAR_NAV = CALENDARS.map((calendar, index) => ({
  href: index === 0 ? calendar.nav.href ?? "/calendar" : `/calendar/${calendar.id}`,
  label: calendar.nav.label,
  iconKey: calendar.nav.iconKey,
  adminOnly: calendar.nav.adminOnly,
  ...(calendar.nav.requires ? { requires: calendar.nav.requires } : {}),
}));
