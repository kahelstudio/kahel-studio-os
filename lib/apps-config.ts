import {
  LayoutDashboard,
  Users,
  CalendarClock,
  ShoppingCart,
  MessageSquareWarning,
  Wallet,
  FileText,
  Wrench,
  FolderKanban,
  Globe,
  ShieldCheck,
  Package,
  Megaphone,
  Clock,
  UserPlus,
  Banknote,
  ListChecks,
  CalendarRange,
  Bug,
  TrendingUp,
  Settings,
  BookText,
  CircleUserRound,
  SlidersHorizontal,
  ServerCog,
  type LucideIcon,
} from "lucide-react";

export type AccentId = "orange" | "teal" | "indigo" | "ink";
export type AppPhase = "live" | "phase2" | "system";

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface AppDef {
  id: string;
  name: string;
  description: string;
  accent: AccentId;
  icon: LucideIcon;
  phase: AppPhase;
  phaseLabel?: string;
  href: string;
  nav: NavItem[];
  showInLauncher?: boolean;
}

export const ACCENTS: Record<AccentId, { base: string; tint: string; text: string }> = {
  orange: {
    base: "var(--color-kahel-500)",
    tint: "var(--color-kahel-100)",
    text: "var(--color-kahel-700)",
  },
  teal: {
    base: "var(--color-teal-500)",
    tint: "var(--color-teal-100)",
    text: "var(--color-teal-800)",
  },
  indigo: {
    base: "var(--color-indigo-500)",
    tint: "var(--color-indigo-100)",
    text: "var(--color-indigo-800)",
  },
  ink: {
    base: "var(--color-ink-600)",
    tint: "var(--color-ink-100)",
    text: "var(--color-ink-700)",
  },
};

export const APPS: AppDef[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Studio operations at a glance",
    accent: "teal",
    icon: LayoutDashboard,
    phase: "live",
    href: "/dashboard",
    nav: [{ id: "overview", label: "Overview", href: "/dashboard" }],
  },
  {
    id: "crm",
    name: "CRM",
    description: "Client relationship follow-ups",
    accent: "ink",
    icon: Users,
    phase: "live",
    href: "/crm/queue",
    nav: [
      { id: "queue", label: "Follow-up queue", href: "/crm/queue" },
      { id: "accounts", label: "Accounts", href: "/crm/accounts" },
    ],
  },
  {
    id: "booking",
    name: "Booking",
    description: "Shoot bookings and calendar",
    accent: "orange",
    icon: CalendarClock,
    phase: "live",
    href: "/booking/list",
    nav: [
      { id: "list", label: "Bookings", href: "/booking/list" },
      { id: "calendar", label: "Calendar", href: "/booking/calendar" },
      { id: "session-types", label: "Session types", href: "/booking/session-types" },
    ],
  },
  {
    id: "pos",
    name: "POS",
    description: "Point of sale for sessions and retail",
    accent: "orange",
    icon: ShoppingCart,
    phase: "live",
    href: "/pos/sale",
    nav: [
      { id: "sale", label: "New sale", href: "/pos/sale" },
      { id: "cat-sessions", label: "Studio sessions", href: "/pos/cat-sessions" },
      { id: "cat-events", label: "Event coverage", href: "/pos/cat-events" },
      { id: "cat-rentals", label: "Rentals", href: "/pos/cat-rentals" },
      { id: "cat-retail", label: "Retail", href: "/pos/cat-retail" },
      { id: "cat-addons", label: "Add-ons", href: "/pos/cat-addons" },
      { id: "reconciliation", label: "Daily reconciliation", href: "/pos/reconciliation" },
    ],
  },
  {
    id: "feedback",
    name: "Feedback",
    description: "Internal problem reporting",
    accent: "ink",
    icon: MessageSquareWarning,
    phase: "live",
    href: "/feedback/report",
    nav: [
      { id: "report", label: "Report a problem", href: "/feedback/report" },
      { id: "myreports", label: "My reports", href: "/feedback/myreports" },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Invoices, sales, and reconciliation",
    accent: "teal",
    icon: Wallet,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/finance/invoices",
    nav: [
      { id: "invoices", label: "Invoice records", href: "/finance/invoices" },
      { id: "sales", label: "Sales", href: "/finance/sales" },
      { id: "expenses", label: "Expenses", href: "/finance/expenses" },
      { id: "payments", label: "Payments", href: "/finance/payments" },
      { id: "reconciliation", label: "Reconciliation", href: "/finance/reconciliation" },
    ],
  },
  {
    id: "quotation",
    name: "Quotation",
    description: "Quotes and drafts",
    accent: "orange",
    icon: FileText,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/quotation/list",
    nav: [
      { id: "list", label: "All quotations", href: "/quotation/list" },
      { id: "drafts", label: "Drafts", href: "/quotation/drafts" },
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance & repair",
    description: "Equipment servicing schedule",
    accent: "teal",
    icon: Wrench,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/maintenance/schedule",
    nav: [
      { id: "schedule", label: "Schedule", href: "/maintenance/schedule" },
      { id: "history", label: "History", href: "/maintenance/history" },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Post-production pipeline",
    accent: "indigo",
    icon: FolderKanban,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/projects/pipeline",
    nav: [
      { id: "pipeline", label: "Post-production", href: "/projects/pipeline" },
      { id: "deliveries", label: "Gallery delivery", href: "/projects/deliveries" },
    ],
  },
  {
    id: "website",
    name: "Website",
    description: "Portfolio and content",
    accent: "ink",
    icon: Globe,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/website/portfolio",
    nav: [
      { id: "portfolio", label: "Portfolio", href: "/website/portfolio" },
      { id: "pages", label: "Pages", href: "/website/pages" },
    ],
  },
  {
    id: "compliance",
    name: "Compliance",
    description: "Regulatory register and tracking",
    accent: "indigo",
    icon: ShieldCheck,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/compliance/dashboard",
    nav: [
      { id: "dashboard", label: "Overview", href: "/compliance/dashboard" },
      { id: "register", label: "Register", href: "/compliance/register" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Equipment register and checkouts",
    accent: "teal",
    icon: Package,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/inventory/equipment",
    nav: [
      { id: "equipment", label: "Equipment", href: "/inventory/equipment" },
      { id: "checkouts", label: "Checkouts", href: "/inventory/checkouts" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Campaigns and attribution",
    accent: "orange",
    icon: Megaphone,
    phase: "phase2",
    phaseLabel: "Phase 3",
    href: "/marketing/campaigns",
    nav: [
      { id: "campaigns", label: "Campaigns", href: "/marketing/campaigns" },
      { id: "attribution", label: "Attribution", href: "/marketing/attribution" },
    ],
  },
  {
    id: "attendance",
    name: "Attendance",
    description: "Timesheets and engagements",
    accent: "indigo",
    icon: Clock,
    phase: "phase2",
    phaseLabel: "Phase 4",
    href: "/attendance/timesheets",
    nav: [
      { id: "timesheets", label: "Timesheets", href: "/attendance/timesheets" },
      { id: "engagements", label: "Engagements", href: "/attendance/engagements" },
    ],
  },
  {
    id: "recruitment",
    name: "Recruitment",
    description: "Hiring, onboarding, offboarding",
    accent: "indigo",
    icon: UserPlus,
    phase: "phase2",
    phaseLabel: "Phase 5",
    href: "/recruitment/candidates",
    nav: [
      { id: "candidates", label: "Candidates", href: "/recruitment/candidates" },
      { id: "roles", label: "Open roles", href: "/recruitment/roles" },
      { id: "hires", label: "New hires", href: "/recruitment/hires" },
      { id: "templates", label: "Onboarding checklists", href: "/recruitment/templates" },
      { id: "departures", label: "Departures", href: "/recruitment/departures" },
      { id: "checklist", label: "Exit checklist", href: "/recruitment/checklist" },
    ],
  },
  {
    id: "payroll",
    name: "Payroll",
    description: "Pay runs, contributions, payslips",
    accent: "indigo",
    icon: Banknote,
    phase: "phase2",
    phaseLabel: "Phase 4",
    href: "/payroll/overview",
    nav: [
      { id: "overview", label: "Overview", href: "/payroll/overview" },
      { id: "runs", label: "Pay runs", href: "/payroll/runs" },
      { id: "employees", label: "Employees", href: "/payroll/employees" },
      { id: "adjustments", label: "Adjustments", href: "/payroll/adjustments" },
      { id: "payslips", label: "Payslips", href: "/payroll/payslips" },
      { id: "contributions", label: "Contributions", href: "/payroll/contributions" },
      { id: "thirteenth", label: "13th-month pay", href: "/payroll/thirteenth" },
      { id: "reports", label: "Reports", href: "/payroll/reports" },
      { id: "settings", label: "Settings", href: "/payroll/settings" },
      { id: "audit", label: "Audit log", href: "/payroll/audit" },
      { id: "states", label: "System states", href: "/payroll/states" },
    ],
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Team task board",
    accent: "teal",
    icon: ListChecks,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/tasks/board",
    nav: [
      { id: "board", label: "Board", href: "/tasks/board" },
      { id: "mine", label: "My tasks", href: "/tasks/mine" },
    ],
  },
  {
    id: "shiftboard",
    name: "Shiftboard",
    description: "Weekly shift scheduling",
    accent: "teal",
    icon: CalendarRange,
    phase: "phase2",
    phaseLabel: "Phase 4",
    href: "/shiftboard",
    nav: [{ id: "board", label: "This week", href: "/shiftboard" }],
  },
  {
    id: "glitches",
    name: "Glitches",
    description: "Bug tracking",
    accent: "orange",
    icon: Bug,
    phase: "phase2",
    phaseLabel: "Phase 2",
    href: "/glitches/open",
    nav: [
      { id: "open", label: "Open", href: "/glitches/open" },
      { id: "closed", label: "Closed", href: "/glitches/closed" },
    ],
  },
  {
    id: "performance",
    name: "Performance",
    description: "Reviews and goals",
    accent: "indigo",
    icon: TrendingUp,
    phase: "phase2",
    phaseLabel: "Phase 5",
    href: "/performance/me",
    nav: [
      { id: "me", label: "My performance", href: "/performance/me" },
      { id: "reviews", label: "Reviews", href: "/performance/reviews" },
      { id: "goals", label: "Goals", href: "/performance/goals" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    description: "Studio configuration",
    accent: "ink",
    icon: Settings,
    phase: "system",
    href: "/settings/general",
    nav: [
      { id: "general", label: "General", href: "/settings/general" },
      { id: "team", label: "Team & roles", href: "/settings/team" },
      { id: "billing", label: "Billing & BIR", href: "/settings/billing" },
    ],
  },
  {
    id: "policies",
    name: "Company Policies",
    description: "Handbook and IT policy",
    accent: "ink",
    icon: BookText,
    phase: "system",
    href: "/policies/handbook",
    nav: [
      { id: "handbook", label: "Company policies", href: "/policies/handbook" },
      { id: "it", label: "IT policy", href: "/policies/it" },
    ],
  },
  {
    id: "profile",
    name: "My profile",
    description: "Identity and security",
    accent: "indigo",
    icon: CircleUserRound,
    phase: "system",
    href: "/profile/me",
    nav: [
      { id: "me", label: "Profile", href: "/profile/me" },
      { id: "security", label: "Security", href: "/profile/security" },
    ],
  },
  {
    id: "preferences",
    name: "Preferences",
    description: "Appearance and notifications",
    accent: "ink",
    icon: SlidersHorizontal,
    phase: "system",
    href: "/preferences/general",
    nav: [
      { id: "general", label: "General", href: "/preferences/general" },
      { id: "appearance", label: "Appearance", href: "/preferences/appearance" },
      { id: "notifications", label: "Notifications", href: "/preferences/notifications" },
    ],
  },
  {
    id: "system",
    name: "System",
    description: "Logs and usage",
    accent: "ink",
    icon: ServerCog,
    phase: "system",
    href: "/system/logs",
    nav: [
      { id: "logs", label: "Logs", href: "/system/logs" },
      { id: "usage", label: "Usage", href: "/system/usage" },
    ],
  },
];

export const APPS_BY_ID: Record<string, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
);

export function getAppByPath(pathname: string): AppDef | undefined {
  const segment = pathname.split("/").filter(Boolean)[0];
  return APPS.find((a) => a.href.split("/").filter(Boolean)[0] === segment);
}
