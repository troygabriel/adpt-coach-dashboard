export const ROUTES = {
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  DASHBOARD: "/dashboard",
  CLIENTS: "/clients",
  CHECK_INS: "/check-ins",
  PROGRAMS: "/programs",
  MESSAGES: "/messages",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
} as const;

// Order reflects daily-use frequency: triage first, admin last.
export const NAV_ITEMS = [
  { title: "Home", href: ROUTES.DASHBOARD, icon: "LayoutDashboard" },
  { title: "Check-ins", href: ROUTES.CHECK_INS, icon: "ClipboardCheck" },
  { title: "Clients", href: ROUTES.CLIENTS, icon: "Users" },
  { title: "Programs", href: ROUTES.PROGRAMS, icon: "Dumbbell" },
  { title: "Messages", href: ROUTES.MESSAGES, icon: "MessageSquare" },
  { title: "Analytics", href: ROUTES.ANALYTICS, icon: "BarChart3" },
  { title: "Settings", href: ROUTES.SETTINGS, icon: "Settings" },
] as const;

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  paused: "Paused",
  archived: "Archived",
};
