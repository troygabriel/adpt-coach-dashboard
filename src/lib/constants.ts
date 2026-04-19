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

export const NAV_ITEMS = [
  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: "LayoutDashboard" },
  { title: "Clients", href: ROUTES.CLIENTS, icon: "Users" },
  { title: "Check-ins", href: ROUTES.CHECK_INS, icon: "ClipboardCheck" },
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
