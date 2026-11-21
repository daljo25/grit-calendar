# Contributing

Thanks for taking the time. This is a community Grit plugin, so a pull request
is welcome whether it fixes a selector, adds a shape, or corrects a sentence in
the README.

## Before you open a pull request

```bash
go build -o /tmp/grit ./cmd/grit        # from a Grit checkout
GRIT_BIN=/tmp/grit ./tests/verify.sh
```

That scaffolds a triple Next and a triple Vite project, installs the plugin,
checks every file and injection, removes it and checks again. Both halves
matter: removal replays the lockfile backwards, so a change that edits a file
outside the injection mechanism installs fine and leaves wreckage behind.

For anything that touches the admin code, also type-check and test the shape you
changed, in a scaffolded project:

```bash
pnpm install
cd apps/admin && npx tsc --noEmit && pnpm test
```

A TanStack admin needs `pnpm exec tsr generate` before `tsc`, since its route
tree does not exist until it is generated.

CI runs the same install and remove cycle on three shapes (triple Next, triple
Vite, API-only), type-checks both admins and runs both suites. It runs on
`main`, on pull requests, and on tags.

## Ground rules

**Nothing about a real application.** No field names, route names, sample
records or comments taken from the project you tested with. Everything a user
sees comes from their `calendar.ts`; if a value is specific to one app, it is a
configuration option, not a default.

**Use the admin's own primitives.** `ResponsiveSheet`, `Input` and
`inputClasses`, `Button`, `ConfirmModal`, the theme tokens. A plugin that
invents its own spacing or colours stops matching the admin the day the theme
changes. Styling is limited to the two CSS rules that hide CalendarKit controls
it exposes no prop for.

**Prefer a documented CalendarKit API over a workaround.** Two CSS selectors
already depend on that library's class names, which is why `calendarkit-pro` is
pinned to an exact version. A third is a real cost, so argue for it.

**Anchor on a `// grit:` marker, never on generated source.** An injection whose
marker is a line of Grit's own output, such as a seeded catalogue row, a JSX
condition or a version comment, installs "cleanly" and does nothing the day
that line is reformatted. A marker that is absent is a hard error, which is the
failure you want. Grit 3.558.0 added the markers this plugin uses, and
`grit upgrade` adds them to an existing project.

**Every injection needs a removal, and a `when` clause.** The manifest's
injections are what removal replays; an entry without a `when` will try to
write admin files into a project that has no admin. The API-only CI job exists
to catch exactly that.

**A file is `shared/` only when both shapes can run the same body.** Not when
two shapes happen to use the same relative path: `calendar-create-intent.tsx`
exists in both directories with different content, because one imports
`next/navigation` and the other `@/lib/next-compat`. The same rule applies to
the tests: anything under `files/shared/__tests__` imports through `@/`, since
`../` only resolves where the tests sit beside the components.

`plugin.json` maps directories, so a new component inside
`files/shared/components/calendar/` installs with no manifest change. A new
directory still needs an entry.

## Releasing

For the maintainer, since it changes what the repository says in public:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z: one line on what this release is"
git push origin vX.Y.Z
```

Push the tag by name. `git push --tags` sends every tag in the repository,
including any you did not mean to publish. Pushing a tag runs the CI suite once
more, which is the last check before the release is announced anywhere.

Then publish the release from that tag, with the notes taken from the top
section of `CHANGELOG.md`. Bump `version` in `plugin.json` and write that
section first: the manifest is what `grit plugin add` installs, so a release
that changes it without a version is a release nobody can tell apart from the
last one.

`plugin.json`'s `description` is what `grit plugin list` shows, so keep it short
and accurate. `nextSteps` is what `grit plugin add` prints, and it names both
configuration paths on purpose: the Next one and the TanStack one.
