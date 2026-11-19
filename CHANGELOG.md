# Changelog

## 0.5.0

First publishable beta. No behaviour changed since 0.4.4.

- MIT license added.
- `calendarkit-pro` pinned to exact 2.0.0. Two CSS rules that hide CalendarKit's
  Create button and context-menu Delete depend on that version's class names.
- Triple + Vite/TanStack support: the shared files are installed under
  `apps/admin/src`, with frontend-specific components, pages and route shims.
  Double, single, API-only and mobile projects remain pending.
- Source grouped by shape instead of by file type: `files/shared`,
  `files/next`, `files/tanstack`, with paths relative to the admin root. This
  removes the `-tanstack` filename suffix and makes every `from` derivable from
  its `to`. The manifest still lists a shared file twice, once per frontend.
- Component tests for `?action=create`, the edit sheet's field allowlist and
  the delete confirmation: 15 tests, in the Next.js admin. The Vite admin gets
  none, and cannot: its `vitest.config.ts` points `@` at the app root instead
  of `src/`, so a test importing app code fails to resolve. Grit's own scaffold
  skips its component tests there for the same reason.
- README rewritten for a public release, including limitations and i18n being
  deferred to a later version.

## 0.4.4

- `?action=create` now works for resources with the default sheet formView.
  A small bridge injected into the resource page opens the same create sheet
  the resource's own New button uses, then clears the query parameter. Page
  formView resources are left to the framework's existing handling.

## 0.4.3

- Create now redirects to the resource's own create screen
  (`/resources/<slug>?action=create`) instead of opening a sheet in the
  calendar. The resource screen knows every required field.
- Delete from CalendarKit's right-click menu asks for confirmation before the
  DELETE is sent. The event is restored while the dialog is open, so it does
  not vanish before the reader answers.

## 0.4.2

- `canDelete: false` now hides Delete in CalendarKit's right-click menu too,
  not just in the plugin's edit sheet.
- `canCreate: false` hides the floating Create button; `true` opens a create
  sheet seeded from the clicked slot and writes the row through POST.
- The edit form handles the create case CalendarKit passes as an event-less
  form, so the Create button no longer opens an empty dialog.

## 0.4.1

- Removed every value tied to the test project from the shipped config,
  comments, examples and test fixtures. The default `id` is `default`, the
  widget title is generic, `lane.foreignKey` is empty and auto-detected, and
  the documented resource pair is `Booking`/`Lane`.
- The mapping resolves an empty field name from the resource definition, so an
  explicit slug with an empty field still works instead of writing to a `""`
  key.

## 0.4.0

- `editing.canCreate` hides CalendarKit's floating Create button. On true, a
  quick create writes a row through POST with the same field mapping.
- A Delete coming from CalendarKit's own context menu no longer removes the
  event locally when `editing.canDelete` is false: the callbacks resync the
  events array, so the toast can say "deleted" without the row disappearing.
- The plugin source is now grouped into `files/config`, `files/components`,
  `files/pages` and `files/tests`. The manifest still names one file per
  destination because `localFile` has no directory form.

## 0.3.2

- The edit form uses the admin's own `ResponsiveSheet`, `Input`, `Button` and
  `ConfirmModal` instead of hand-written styling, so it follows Grit's
  desktop-sheet / mobile-sheet pattern and its theme tokens.
- Saving and deleting now go through CalendarKit's documented `onEventUpdate`
  and `onEventDelete` callbacks instead of diffing the whole event list.

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
