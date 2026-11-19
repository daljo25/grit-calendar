/**
 * grit-calendar configuration.
 *
 * This is the file to edit after `grit plugin add calendar`. Everything the
 * plugin shows is driven from here: the two resources it reads, the sidebar
 * entry, the dashboard widget, the timezone and the theme.
 *
 * Leave a slug empty to let the page infer it from the admin's resource
 * registry: the first resource with a datetime field supplies the events, and
 * the resource named by its first relationship-select supplies the rows.
 */

export type CalendarTheme = "grit" | "calm" | "vivid" | "editorial";

export interface CalendarSettings {
  nav: {
    label: string;
    iconKey: string;
    href: string;
  };
  widget: {
    enabled: boolean;
    title: string;
    max: number;
  };
  event: {
    slug: string;
    titleField: string;
    startField: string;
    endField: string;
    pageSize: number;
  };
  lane: {
    slug: string;
    labelField: string;
    foreignKey: string;
  };
  /** IANA timezone used to display and write event times. */
  timezone: string;
  /** "grit" follows the admin's CSS variables; the others are CalendarKit presets. */
  theme: CalendarTheme;
}

export const CALENDAR_CONFIG: CalendarSettings = {
  nav: { label: "Calendar", iconKey: "CalendarDays", href: "/calendar" },
  widget: { enabled: true, title: "Next appointments", max: 5 },
  event: {
    slug: "",
    titleField: "title",
    startField: "starts_at",
    endField: "ends_at",
    pageSize: 500,
  },
  lane: { slug: "", labelField: "name", foreignKey: "room_id" },
  // The generated seeders write UTC wall-clock times. UTC here makes an 09:00
  // database value show as 09:00 instead of shifting with the browser zone.
  timezone: "UTC",
  theme: "grit",
};

/** The sidebar entry, read by the nav injection so label and icon are editable. */
export const CALENDAR_NAV = {
  href: CALENDAR_CONFIG.nav.href,
  label: CALENDAR_CONFIG.nav.label,
  iconKey: CALENDAR_CONFIG.nav.iconKey,
};
