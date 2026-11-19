# grit-calendar

A community plugin for Grit. It installs one or more resource calendars plus an
optional dashboard widget, using [CalendarKit Pro](https://calendarkit.io/)
(MIT) for the views, the time grid and drag and drop.

Each calendar reads two generated resources:

- the **event** resource supplies the events from a `datetime` field;
- the **row** resource supplies the lanes through a relationship field on the
  event (rooms, people, equipment).

Click an event opens its record page. Dragging it to another row or time writes
a `PATCH` to the generated resource endpoint. Editing in the calendar uses a
form built only from the resource fields you allow, so CalendarKit's generic
Location, Guests, Reminders and Description fields never appear.

The repository was started with `grit plugin new calendar` and keeps that
workflow, with a Vitest step added for the data helpers.

## Install

```bash
grit plugin add github.com/daljo25/grit-calendar
pnpm install
```

## Configuration

Everything is in **`apps/admin/config/calendar.ts`**, written by the plugin. It
is documented line by line with the options and default of every setting. Edit
a value, save, and Next hot-reloads. Reinstalling is never needed.

`CALENDARS` is an array so one install can serve, for example, a calendar for
admins and another for members. The first entry keeps `/calendar`; every other
entry is at `/calendar/<id>`. The sidebar and the widget are derived from the
same array.

| Setting | What it does |
|---|---|
| `id` | URL segment for `/calendar/<id>`; the first entry is `/calendar` |
| `nav.label`, `nav.iconKey`, `nav.adminOnly`, `nav.requires` | Sidebar link and its visibility |
| `widget.enabled`, `widget.title`, `widget.max` | Dashboard feed of upcoming events |
| `event.slug`, `lane.slug` | The two resources; empty means auto-detect |
| `event.*Field`, `lane.*Field` | Field names used to map records to events and rows |
| `editing.canEdit` | `false` makes the calendar read only, including drag |
| `editing.canCreate` | `false` hides the floating Create button; `true` redirects to the resource create screen |
| `editing.canDelete` | `false` hides Delete in the edit sheet and the right-click menu; `true` asks for confirmation and deletes (both the sheet and the right-click menu) |
| `editing.fields` | Resource fields the edit form may change, e.g. `["starts_at", "ends_at", "lane_id"]` |
| `editing.openOnClick` | `"detail"` opens the record page, `"edit"` opens the form |
| `timezone` | IANA zone; `UTC` keeps a 09:00 database value at 09:00 |
| `theme` | `"grit"` follows the admin's theme tokens; other values are CalendarKit presets |

Example resources:

```bash
grit generate resource Lane --fields 'name:string'
grit generate resource Booking \
  --fields 'title:string,starts_at:datetime,ends_at:datetime,lane:belongs_to[Lane]'
```

## Supported projects

Version 0.3.0 targets a **triple** project with a **Next.js** admin. A community
plugin manifest has static project paths and no admin-root placeholder, so
every file and injection carries `when: { architecture: ["triple"], frontend:
["next"] }`. On other shapes the plugin writes nothing.

## Out of scope

Creation from the quick card only writes a row when `editing.canCreate` is
true; it is off by default. Deletions only reach the API when
`editing.canDelete` is true.

## Verification

```bash
go build -o /tmp/grit ./cmd/grit        # from a Grit checkout
GRIT_BIN=/tmp/grit ./tests/verify.sh
```

The script scaffolds a fresh project, installs the plugin, checks the files and
injections, builds the API, removes the plugin and builds again. CI also runs
`tsc --noEmit` and `vitest run __tests__/calendar-data.test.ts` in the generated
admin.
