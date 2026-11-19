# grit-calendar

A community plugin for Grit. It installs a `/calendar` screen and an optional
dashboard widget, using [CalendarKit Pro](https://calendarkit.io/) (MIT) for the
views, the time grid and drag and drop.

The plugin reads two generated resources:

- the **event** resource supplies the events from a `datetime` field;
- the **row** resource supplies the lanes through a relationship field on the
  event (rooms, people, equipment).

Click an event opens its record page. Dragging it to another row or time writes
a `PATCH` to the generated resource endpoint. Editing a title in CalendarKit's
card also writes through, and invalidates the resource's query cache so the
admin table shows the new value.

The repository was started with `grit plugin new calendar` and keeps that
workflow: install into a fresh project, type-check, remove, build again.

## Install

```bash
grit plugin add github.com/daljo25/grit-calendar
pnpm install
```

## Configuration

Everything is in **`apps/admin/config/calendar.ts`**, written by the plugin. Edit
that one file, save, and Next hot-reloads. No reinstall is needed.

```ts
export const CALENDAR_CONFIG: CalendarSettings = {
  nav: { label: "Calendar", iconKey: "CalendarDays", href: "/calendar" },
  widget: { enabled: true, title: "Next appointments", max: 5 },
  event: {
    slug: "",          // e.g. "appointments"
    titleField: "title",
    startField: "starts_at",
    endField: "ends_at",
    pageSize: 500,
  },
  lane: {
    slug: "",          // e.g. "rooms"
    labelField: "name",
    foreignKey: "room_id",
  },
  timezone: "UTC",
  theme: "grit",
};
```

| Setting | What it does |
|---|---|
| `nav.label`, `nav.href` | Sidebar text and URL, read by the nav injection |
| `nav.iconKey` | Icon name. It must exist in `lib/icons.ts`; `CalendarDays` is injected by default |
| `widget.enabled` | Show or hide the dashboard widget |
| `widget.title`, `widget.max` | Widget heading and number of upcoming events |
| `event.slug`, `lane.slug` | The two resources. Empty means auto-detect |
| `event.*Field`, `lane.*Field` | Field names used to map records to events and rows |
| `timezone` | IANA zone. `UTC` makes a 09:00 database value show as 09:00 |
| `theme` | `"grit"` follows the admin's theme tokens; `calm`, `vivid` and `editorial` are CalendarKit presets |

Auto-detection, when the slugs are empty, takes the first resource with a
`datetime` field as the event resource and the resource named by its first
`relationship-select` as the row resource.

Example resources:

```bash
grit generate resource Room --fields 'name:string'
grit generate resource Appointment \
  --fields 'title:string,starts_at:datetime,ends_at:datetime,room:belongs_to[Room]'
```

## Supported projects

Version 0.2.0 targets a **triple** project with a **Next.js** admin. A community
plugin manifest has static project paths and no admin-root placeholder, so every
file and injection carries `when: { architecture: ["triple"], frontend:
["next"] }`. On other shapes the plugin writes nothing. A community manifest has
no preflight hook, so this is a no-op rather than a loud refusal.

Adding `{{ADMIN_ROOT}}` to the manifest is the prerequisite for double, single
and TanStack projects.

## Out of scope in 0.2.0

Creating and deleting events from CalendarKit's quick card is not persisted.
Only changes to records that already exist are written back.

## Verification

```bash
go build -o /tmp/grit ./cmd/grit        # from a Grit checkout
GRIT_BIN=/tmp/grit ./tests/verify.sh
```

The script scaffolds a fresh project, installs the plugin, checks the files and
injections, builds the API, removes the plugin and builds again. Removal matters
as much as install: it replays the lockfile backwards.
