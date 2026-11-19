# grit-calendar

A community plugin for Grit. It installs a `/calendar` screen in the admin and
uses [CalendarKit Pro](https://calendarkit.io/) for the views, the time grid and
drag and drop.

The screen is built from two generated resources:

- the **event** resource supplies the events from a `datetime` field;
- the **row** resource supplies the lanes from a relationship field on the event
  (rooms, people, equipment).

Clicking an event opens the generated detail page for its record. Dragging an
event to another row changes the relationship; dragging it in time changes the
dates. Both moves are written with `PATCH <resource endpoint>/<id>`, which every
generated Grit resource has.

The repository was started with `grit plugin new calendar` and keeps that
workflow, adapted: install on a fresh project, type-check the admin, remove the
plugin and build again.

## Install

```bash
grit plugin add github.com/daljo25/grit-calendar
pnpm install
```

The plugin writes one page and three injections (the sidebar link and the icon,
which is imported and mapped). It does not add Go code or migrations.

## Configuration

Open `apps/admin/app/(dashboard)/calendar/page.tsx`. The `config` block at the
top names the fields:

```ts
const config: Mapping = {
  eventSlug: "",        // e.g. "appointments"
  laneSlug: "",         // e.g. "rooms"
  titleField: "title",
  startField: "starts_at",
  endField: "ends_at",
  laneField: "room_id",
  laneLabelField: "name",
};
```

Leave `eventSlug` empty and the page infers the mapping from the admin's own
resource registry: the first resource with a `datetime` field is the event, and
the resource named by its first `relationship-select` is the row. Set the two
slugs explicitly if that guess is not what you want.

The event resource needs a datetime field and a relationship-select to the row
resource. For example:

```bash
grit generate resource Room --fields 'name:string'
grit generate resource Appointment \
  --fields 'title:string,starts_at:datetime,ends_at:datetime,room:belongs_to[Room]'
```

## Supported projects

Version 0.1.0 targets a **triple** project (separate API, web and admin) with a
**Next.js** admin. A community plugin manifest has static project paths and no
admin-root placeholder, so writing into a double, single, embedded or TanStack
admin would land in a directory the app never compiles. Every file and every
injection therefore carries `when: { architecture: ["triple"], frontend:
["next"] }`: on other shapes the plugin writes nothing and patches nothing.
A community manifest has no preflight hook, so this is a no-op rather than a
loud refusal; the `when` clauses are what keep it from doing damage.

Adding `{{ADMIN_ROOT}}` to the plugin manifest is the prerequisite for the other
shapes, followed by a TanStack page variant.

## Verification

```bash
go build -o /tmp/grit ./cmd/grit        # from a Grit checkout
GRIT_BIN=/tmp/grit ./tests/verify.sh
```

The script scaffolds a fresh project, installs the plugin, checks the written
files and injections, builds the generated API, removes the plugin and builds
again. Removal matters as much as install: it replays the lockfile backwards,
so a plugin that edits a file outside the injection mechanism leaves wreckage.

The frontend was checked separately against a project with `Room` and
`Appointment` resources. `pnpm --filter <project>-admin exec tsc --noEmit`
passes and `next build` emits `/calendar`. The auto-detected mapping picks
`appointments` as the event resource and `rooms` as the rows.
