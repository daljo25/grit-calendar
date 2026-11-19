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

PAGE='apps/admin/app/(dashboard)/calendar/page.tsx'
test -f "$PAGE"
grep -q 'calendarkit-pro' "$PAGE"
grep -q 'href: "/calendar"' apps/admin/components/chrome/CollapsibleSidebar.tsx
grep -q 'CalendarDays' apps/admin/lib/icons.ts
grep -q 'calendarkit-pro' apps/admin/package.json

(cd apps/api && go build ./...)

"$BIN" plugin remove calendar --force

test ! -f "$PAGE"
if grep -q 'href: "/calendar"' apps/admin/components/chrome/CollapsibleSidebar.tsx; then
  echo "removal left the sidebar link behind" >&2
  exit 1
fi
if grep -q 'CalendarDays' apps/admin/lib/icons.ts; then
  echo "removal left the icon behind" >&2
  exit 1
fi
(cd apps/api && go build ./...)

echo "grit-calendar: install and remove verified"
