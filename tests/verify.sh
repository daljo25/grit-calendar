#!/usr/bin/env bash
# Install the plugin on a freshly scaffolded project, then remove it.
# Both halves matter: removal replays the lockfile backwards, so a plugin that
# edits a file outside the injection mechanism installs fine and leaves wreckage.
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${GRIT_BIN:-grit}"
WORK="${TMPDIR:-/tmp}/grit-calendar-verify-$$"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK"
cd "$WORK"

"$BIN" new cal-verify --triple --next --db sqlite --storage local >/dev/null
cd cal-verify

# grit plugin add refuses a dirty tree, and it is right to: a committed tree
# makes what the plugin did reviewable with git diff.
git init -q
git add -A
git -c user.name=verify -c user.email=verify@example.com commit -qm init

"$BIN" plugin add "$PLUGIN_DIR" --force

CONFIG='apps/admin/config/calendar.ts'
DATA='apps/admin/components/calendar/calendar-data.ts'
FORM='apps/admin/components/calendar/calendar-event-form.tsx'
VIEW='apps/admin/components/calendar/calendar-view.tsx'
PAGE='apps/admin/app/(dashboard)/calendar/page.tsx'
IDPAGE='apps/admin/app/(dashboard)/calendar/[id]/page.tsx'
TEST='apps/admin/__tests__/calendar-data.test.ts'
TEST_INTENT='apps/admin/__tests__/calendar-create-intent.test.tsx'
TEST_FORM='apps/admin/__tests__/calendar-event-form.test.tsx'
WIDGET='apps/admin/components/calendar/calendar-widget.tsx'
CSS='apps/admin/components/calendar/calendar.css'
SIDEBAR='apps/admin/components/chrome/CollapsibleSidebar.tsx'
ICONS='apps/admin/lib/icons.ts'
CATALOG='apps/admin/lib/dashboard-catalog.ts'
DASHBOARD='apps/admin/app/(dashboard)/dashboard/page.tsx'

for file in "$CONFIG" "$DATA" "$FORM" "$VIEW" "$PAGE" "$IDPAGE" "$TEST" "$TEST_INTENT" "$TEST_FORM" "$WIDGET" "$CSS"; do
  test -f "$file" || { echo "missing $file" >&2; exit 1; }
done

grep -q 'timezone: "UTC"' "$CONFIG"
grep -q 'theme: "grit"' "$CONFIG"
grep -q 'canDelete: false' "$CONFIG"
grep -q '...CALENDAR_NAV' "$SIDEBAR"
grep -q 'CalendarDays' "$ICONS"
grep -q 'system:calendar' "$CATALOG"
grep -q 'CalendarWidget' "$DASHBOARD"
grep -q 'calendarkit-pro' apps/admin/package.json

(cd apps/api && go build ./...)

"$BIN" plugin remove calendar --force

for file in "$CONFIG" "$DATA" "$FORM" "$VIEW" "$PAGE" "$IDPAGE" "$TEST" "$WIDGET" "$CSS"; do
  test ! -f "$file" || { echo "removal left $file behind" >&2; exit 1; }
done
if grep -q 'CALENDAR_NAV' "$SIDEBAR"; then
  echo "removal left the sidebar link behind" >&2
  exit 1
fi
if grep -q 'CalendarDays' "$ICONS"; then
  echo "removal left the icon behind" >&2
  exit 1
fi
if grep -q 'system:calendar\|CalendarWidget' "$CATALOG" "$DASHBOARD"; then
  echo "removal left the dashboard widget behind" >&2
  exit 1
fi
# The dependency is what the community review caught: removal used to revert
# every file and leave calendarkit-pro in package.json.
if grep -q 'calendarkit-pro' apps/admin/package.json; then
  echo "removal left calendarkit-pro in the Next admin" >&2
  exit 1
fi
(cd apps/api && go build ./...)

# Triple + Vite (TanStack) has different paths for the admin code. The same
# manifest must land in src/ and add the same injections there. A build is not
# needed here: Grit's generated route tree and Vitest alias are scaffold
# concerns, not plugin ones.
cd "$WORK"
"$BIN" new cal-vite-verify --triple --vite --db sqlite --storage local >/dev/null
cd cal-vite-verify
git init -q
git add -A
git -c user.name=verify -c user.email=verify@example.com commit -qm init
"$BIN" plugin add "$PLUGIN_DIR" --force >/dev/null

for file in \
  "apps/admin/src/config/calendar.ts" \
  "apps/admin/src/components/calendar/calendar-data.ts" \
  "apps/admin/src/components/calendar/calendar-event-form.tsx" \
  "apps/admin/src/components/calendar/calendar-view.tsx" \
  "apps/admin/src/components/calendar/calendar-widget.tsx" \
  "apps/admin/src/components/calendar/calendar.css" \
  "apps/admin/src/components/calendar/calendar-create-intent.tsx" \
  "apps/admin/src/routes/_dashboard/calendar.tsx" \
  'apps/admin/src/routes/_dashboard/calendar/$id.tsx' \
  "apps/admin/__tests__/calendar-data.test.ts" \
  "apps/admin/__tests__/calendar-event-form.test.tsx"; do
  test -f "$file" || { echo "missing $file" >&2; exit 1; }
done
grep -q 'CALENDAR_NAV' apps/admin/src/components/chrome/CollapsibleSidebar.tsx
grep -q 'system:calendar' apps/admin/src/lib/dashboard-catalog.ts
grep -q 'CalendarWidget' apps/admin/src/pages/dashboard.tsx

"$BIN" plugin remove calendar --force >/dev/null
test ! -f apps/admin/src/config/calendar.ts
test ! -f apps/admin/__tests__/calendar-data.test.ts
test ! -f apps/admin/__tests__/calendar-event-form.test.tsx
if grep -q 'CALENDAR_NAV' apps/admin/src/components/chrome/CollapsibleSidebar.tsx; then
  echo "removal left the TanStack sidebar link behind" >&2
  exit 1
fi
if grep -q 'calendarkit-pro' apps/admin/package.json; then
  echo "removal left calendarkit-pro in the Vite admin" >&2
  exit 1
fi

echo "grit-calendar: install and remove verified (Next and TanStack)"
