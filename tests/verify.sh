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
PAGE='apps/admin/app/(dashboard)/calendar/page.tsx'
WIDGET='apps/admin/components/calendar/calendar-widget.tsx'
CSS='apps/admin/components/calendar/calendar.css'
SIDEBAR='apps/admin/components/chrome/CollapsibleSidebar.tsx'
ICONS='apps/admin/lib/icons.ts'
CATALOG='apps/admin/lib/dashboard-catalog.ts'
DASHBOARD='apps/admin/app/(dashboard)/dashboard/page.tsx'

for file in "$CONFIG" "$DATA" "$PAGE" "$WIDGET" "$CSS"; do
  test -f "$file" || { echo "missing $file" >&2; exit 1; }
done

grep -q 'timezone: "UTC"' "$CONFIG"
grep -q 'theme: "grit"' "$CONFIG"
grep -q 'href: "/calendar"' "$CONFIG"
grep -q '\.\.\.CALENDAR_NAV' "$SIDEBAR"
grep -q 'CalendarDays' "$ICONS"
grep -q 'system:calendar' "$CATALOG"
grep -q 'CalendarWidget' "$DASHBOARD"
grep -q 'calendarkit-pro' apps/admin/package.json

(cd apps/api && go build ./...)

"$BIN" plugin remove calendar --force

for file in "$CONFIG" "$DATA" "$PAGE" "$WIDGET" "$CSS"; do
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
(cd apps/api && go build ./...)

echo "grit-calendar: install and remove verified"
