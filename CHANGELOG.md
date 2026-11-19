# Changelog

## 0.3.1

- The edit form now renders through a portal to `document.body`. CalendarKit's
  stylesheet is unlayered and wins over Tailwind's layered utilities anywhere
  inside `.ck-root`, which made the card transparent and removed its padding,
  borders and rounded corners.
- Corrected the muted text utility (`text-text-muted`).

## 0.3.0

- Multiple calendars: `CALENDARS` is an array. The first entry owns `/calendar`,
  the rest live at `/calendar/<id>`, and the sidebar gets one link per entry.
- The dashboard widget combines the upcoming events of every enabled calendar,
  each labelled with its own calendar name.
- Replaced CalendarKit's generic edit card with a form built from the resource
  fields listed in `editing.fields`. Location, Guests, Reminders and
  Description no longer appear. `editing.canDelete` defaults to false and
  hides Delete; on true it asks for confirmation and issues a real DELETE.
- `editing.canEdit: false` makes a calendar read only, and
  `editing.openOnClick` chooses between the record page and the edit form.
- Added Vitest coverage for the data helpers: event mapping, one-hour fallback,
  changed fields, UTC wall-clock round trip and detail URLs.

## 0.2.1

- `config/calendar.ts` is now documented line by line: every setting names its
  options, its default and what changes when you edit it. No behaviour changed.

## 0.2.0

- Configuration moved to `apps/admin/config/calendar.ts`: slugs, field mapping,
  sidebar label and icon, widget, timezone and theme.
- Added an optional dashboard widget with the next events and a link to the
  calendar.
- The calendar uses the admin's theme tokens by default (`theme: "grit"`) and
  honours dark mode.
- Event edits made in CalendarKit are written back to the API and invalidate
  the resource's query cache, so the admin table reflects them.
- Default `timezone: "UTC"` stops an 09:00 database value from showing as 10:00
  in a UTC+1 browser.
- Clicking an event opens `/resources/<slug>/<id>`, the route Grit actually
  generates. The old `/view?id=` link showed "This record could not be found".

## 0.1.0

First release. A `/calendar` page for a triple Next.js admin, built on
CalendarKit Pro. Events come from a resource with a datetime field, rows from a
second resource linked by a relationship field. Click opens the record; drag
changes the date and the row through the generated PATCH route.
