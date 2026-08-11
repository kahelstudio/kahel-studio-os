import {
  LayoutDashboard,
  Users,
  Camera,
  ShoppingCart,
  MessageSquareWarning,
  Landmark,
  FileText,
  Settings,
  FolderKanban,
  Globe,
  ShieldCheck,
  Package,
  Megaphone,
  Clock,
  Search,
  Banknote,
  ListChecks,
  CalendarRange,
  Bug,
  TrendingUp,
  BookText,
  CircleUserRound,
  SlidersHorizontal,
  FileClock,
  Gauge,
  ReceiptText,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

export type AccentId = "orange" | "teal" | "indigo" | "ink";
// Matches the design handoff's three launcher sections: Everyday, Operations, System.
// Apps without a launcherGroup (Feedback, My profile, Preferences) are real apps with
// routes/sidebars but are not tiled on the launcher — reached via Help, the avatar
// menu, or the command palette instead, exactly as in the source prototype.
export type LauncherGroup = "live" | "operations" | "system";

interface NavItem {
  id: string;
  label: string;
  href: string;
  group?: string;
  count?: string;
  items?: { label: string; href: string }[];
}

export interface AppDef {
  id: string;
  name: string;
  description: string;
  accent: AccentId;
  icon: LucideIcon;
  href: string;
  nav: NavItem[];
  launcherGroup?: LauncherGroup;
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
    base: "var(--color-text-secondary)",
    tint: "var(--color-surface-muted)",
    text: "var(--color-text-primary)",
  },
};

export const APPS: AppDef[] = [
  // ── Everyday ────────────────────────────────────────────────
  {
    id: "booking",
    name: "Booking",
    description: "Inquiry → quoted → confirmed → completed",
    accent: "orange",
    icon: Camera,
    href: "/booking/list",
    launcherGroup: "live",
    nav: [
      { id: "list", label: "Bookings", href: "/booking/list" },
      { id: "calendar", label: "Calendar", href: "/booking/calendar" },
    ],
  },
  {
    id: "crm",
    name: "CRM",
    description: "Accounts, contacts, and the follow-up queue",
    accent: "ink",
    icon: Users,
    href: "/crm/queue",
    launcherGroup: "live",
    nav: [
      { id: "queue", label: "Follow-up queue", href: "/crm/queue" },
      { id: "accounts", label: "Customers", href: "/crm/accounts" },
    ],
  },
  {
    id: "pos",
    name: "POS",
    description: "Retail sale, stock, BIR serial capture",
    accent: "orange",
    icon: ShoppingCart,
    href: "/pos/sale",
    launcherGroup: "live",
    nav: [
      { id: "sale", label: "New sale", href: "/pos/sale" },
      { id: "bookings", label: "Bookings", href: "/pos/bookings" },
      { id: "cat-sessions", label: "Studio Sessions", href: "/pos/cat-sessions" },
      { id: "cat-events", label: "Event Coverage", href: "/pos/cat-events" },
      { id: "cat-rentals", label: "Rentals", href: "/pos/cat-rentals" },
      { id: "cat-retail", label: "Retail", href: "/pos/cat-retail" },
      { id: "cat-addons", label: "Add-ons", href: "/pos/cat-addons" },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Revenue, balances, schedule, inquiries",
    accent: "teal",
    icon: LayoutDashboard,
    href: "/dashboard",
    launcherGroup: "operations",
    nav: [{ id: "overview", label: "Overview", href: "/dashboard" }],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Invoice records, reconciliation, quotes",
    accent: "teal",
    icon: Landmark,
    href: "/finance/invoices",
    launcherGroup: "operations",
    nav: [
      { id: "invoices", label: "Invoice records", href: "/finance/invoices" },
      { id: "sales", label: "Sales", href: "/finance/sales" },
      { id: "reconciliation", label: "Reconciliation", href: "/finance/reconciliation" },
    ],
  },
  {
    id: "expenses",
    name: "Expenses",
    description: "Studio costs, categories, and money out",
    accent: "orange",
    icon: ReceiptText,
    href: "/expenses",
    launcherGroup: "live",
    nav: [{ id: "expenses", label: "Expenses", href: "/expenses" }],
  },
  {
    id: "payments",
    name: "Payments",
    description: "Collections, balances, and payment records",
    accent: "teal",
    icon: Banknote,
    href: "/payments",
    launcherGroup: "live",
    nav: [{ id: "payments", label: "Payments", href: "/payments" }],
  },
  {
    id: "quotation",
    name: "Quotation",
    description: "Draft, send and track client quotes",
    accent: "orange",
    icon: FileText,
    href: "/quotation/list",
    launcherGroup: "live",
    nav: [
      { id: "list", label: "All quotations", href: "/quotation/list" },
      { id: "drafts", label: "Drafts", href: "/quotation/drafts" },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    description: "Post-production and gallery delivery",
    accent: "indigo",
    icon: FolderKanban,
    href: "/projects/pipeline",
    launcherGroup: "live",
    nav: [
      { id: "all", label: "All projects", href: "/projects/pipeline" },
      { id: "pre-production", label: "Pre-production", href: "/projects/pipeline?stage=pre" },
      { id: "production", label: "Production", href: "/projects/pipeline?stage=production" },
      { id: "post-production", label: "Post-production", href: "/projects/pipeline?stage=post" },
      { id: "deliveries", label: "Galleries", href: "/projects/deliveries" },
    ],
  },
  {
    id: "approvals",
    name: "Approvals",
    description: "Operational and financial request inbox",
    accent: "indigo",
    icon: BadgeCheck,
    href: "/approvals",
    launcherGroup: "live",
    nav: [
      { id: "my-approvals", label: "My approvals", href: "/approvals" },
      { id: "my-requests", label: "My requests", href: "/approvals?tab=my-requests" },
      { id: "completed", label: "Completed", href: "/approvals?tab=completed" },
    ],
  },
  {
    id: "glitches",
    name: "Glitches",
    description: "Production issues and bug reports",
    accent: "orange",
    icon: Bug,
    href: "/glitches",
    launcherGroup: "live",
    nav: [
      { id: "active", label: "Active", href: "/glitches?view=active" },
      { id: "resolved", label: "Resolved", href: "/glitches?view=resolved" },
    ],
  },

  // ── Operations ──────────────────────────────────────────────
  {
    id: "website",
    name: "Website",
    description: "Portfolio and content management",
    accent: "ink",
    icon: Globe,
    href: "/website/portfolio",
    launcherGroup: "operations",
    nav: [
      { id: "portfolio", label: "Portfolio", href: "/website/portfolio" },
      { id: "pages", label: "Pages", href: "/website/pages" },
    ],
  },
  {
    id: "compliance",
    name: "Compliance",
    description: "Permits, renewals & statutory filings",
    accent: "indigo",
    icon: ShieldCheck,
    href: "/compliance/dashboard",
    launcherGroup: "operations",
    nav: [
      { id: "dashboard", label: "Overview", href: "/compliance/dashboard" },
      { id: "register", label: "Register", href: "/compliance/register" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Equipment register, checkout, conflicts",
    accent: "teal",
    icon: Package,
    href: "/inventory/equipment",
    launcherGroup: "live",
    nav: [
      { id: "equipment", label: "Equipment", href: "/inventory/equipment" },
      { id: "checkouts", label: "Checkouts", href: "/inventory/checkouts" },
    ],
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Board, assignments, and due dates",
    accent: "orange",
    icon: ListChecks,
    href: "/tasks/board",
    launcherGroup: "live",
    nav: [
      { id: "board", label: "Board", href: "/tasks/board" },
      { id: "mine", label: "My tasks", href: "/tasks/mine" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Attribution, campaigns, broadcasts",
    accent: "orange",
    icon: Megaphone,
    href: "/marketing/campaigns",
    launcherGroup: "operations",
    nav: [
      { id: "campaigns", label: "Campaigns", href: "/marketing/campaigns" },
      { id: "attribution", label: "Attribution", href: "/marketing/attribution" },
    ],
  },
  {
    id: "attendance",
    name: "Attendance",
    description: "Timesheets and freelance engagements",
    accent: "indigo",
    icon: Clock,
    href: "/attendance/timesheets",
    launcherGroup: "operations",
    nav: [
      { id: "timesheets", label: "Timesheets", href: "/attendance/timesheets" },
      { id: "engagements", label: "Engagements", href: "/attendance/engagements" },
    ],
  },
  {
    id: "shiftboard",
    name: "Shiftboard",
    description: "Weekly shifts and studio coverage",
    accent: "teal",
    icon: CalendarRange,
    href: "/shiftboard",
    launcherGroup: "operations",
    nav: [
      { id: "this-week", label: "This Week", href: "/shiftboard" },
      { id: "next-week", label: "Next Week", href: "/shiftboard/next-week" },
      { id: "next-month", label: "Next Month", href: "/shiftboard/next-month" },
    ],
  },
  {
    id: "recruitment",
    name: "Recruitment",
    description: "Candidates, onboarding & offboarding",
    accent: "indigo",
    icon: Search,
    href: "/recruitment/candidates",
    launcherGroup: "operations",
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
    id: "policies",
    name: "Company policies",
    description: "Handbook, versions & acknowledgements",
    accent: "ink",
    icon: BookText,
    href: "/policies/policies",
    launcherGroup: "operations",
    nav: [
      { id: "policies", label: "Company policies", href: "/policies/policies" },
      { id: "health-safety", label: "Health & safety", href: "/policies/health-safety" },
      { id: "it", label: "IT policy", href: "/policies/it" },
    ],
  },
  {
    id: "payroll",
    name: "Payroll",
    description: "Pay runs, payslips, contributions",
    accent: "indigo",
    icon: Banknote,
    href: "/payroll/overview",
    launcherGroup: "operations",
    nav: [
      { id: "overview", label: "Overview", href: "/payroll/overview" },
      { id: "runs", label: "Pay runs", href: "/payroll/runs" },
      { id: "employees", label: "Employees", href: "/payroll/employees" },
      { id: "adjustments", label: "Adjustments", href: "/payroll/adjustments" },
      { id: "payslips", label: "Payslips", href: "/payroll/payslips" },
      { id: "contributions", label: "Contributions", href: "/payroll/contributions" },
      { id: "thirteenth", label: "13th-month pay", href: "/payroll/thirteenth" },
      { id: "reports", label: "Reports", href: "/payroll/reports", items: [
        { label: "Payroll register", href: "/payroll/reports" },
        { label: "Gross-to-net summary", href: "/payroll/reports" },
        { label: "Earnings summary", href: "/payroll/reports" },
        { label: "Deduction summary", href: "/payroll/reports" },
        { label: "Payroll variance", href: "/payroll/reports" },
        { label: "Contribution summary", href: "/payroll/reports" },
        { label: "13th-month pay", href: "/payroll/reports" },
        { label: "Year-to-date payroll", href: "/payroll/reports" },
        { label: "Withholding tax", href: "/payroll/reports" },
        { label: "Payment status", href: "/payroll/reports" },
        { label: "Attendance-to-payroll", href: "/payroll/reports" },
        { label: "Overtime", href: "/payroll/reports" },
        { label: "Leave deductions", href: "/payroll/reports" },
        { label: "Salary changes", href: "/payroll/reports" },
        { label: "Payroll cost by team", href: "/payroll/reports" },
        { label: "Freelancer payments", href: "/payroll/reports" },
        { label: "Final pay", href: "/payroll/reports" },
        { label: "Payroll adjustments", href: "/payroll/reports" },
        { label: "Payroll audit report", href: "/payroll/reports" },
      ] },
      { id: "states", label: "System states", href: "/payroll/states" },
    ],
  },
  {
    id: "performance",
    name: "Performance",
    description: "Reviews, goals, and growth",
    accent: "indigo",
    icon: TrendingUp,
    href: "/performance/me",
    launcherGroup: "operations",
    nav: [
      { id: "me", label: "My performance", href: "/performance/me" },
      { id: "reviews", label: "Reviews", href: "/performance/reviews" },
      { id: "goals", label: "Goals", href: "/performance/goals" },
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance & repair",
    description: "Preventive upkeep, faults & repairs",
    accent: "teal",
    icon: Settings,
    href: "/maintenance/schedule",
    launcherGroup: "operations",
    nav: [
      { id: "schedule", label: "Schedule", href: "/maintenance/schedule" },
      { id: "history", label: "History", href: "/maintenance/history" },
    ],
  },

  // ── System ──────────────────────────────────────────────────
  {
    id: "reports",
    name: "Reports",
    description: "Analyze, schedule, and export workspace data",
    accent: "orange",
    icon: FileText,
    href: "/reports",
    launcherGroup: "system",
    nav: [
      { id: "overview", label: "Overview", href: "/reports", items: [{ label: "Reports overview", href: "/reports" }, { label: "Favourites · 3", href: "/reports?view=favourites" }, { label: "Recently viewed", href: "/reports?view=recent" }] },
      { id: "business", label: "Business", href: "/reports?category=Sales", items: [{ label: "Sales", href: "/reports?category=Sales" }, { label: "Quotes & finance", href: "/reports?category=Financial" }, { label: "Bookings", href: "/reports?category=Bookings" }, { label: "POS", href: "/reports?category=POS" }, { label: "Clients & CRM", href: "/reports?category=Clients%20%26%20CRM" }, { label: "Projects", href: "/reports?category=Projects" }, { label: "Tasks & productivity", href: "/reports?category=Tasks" }] },
      { id: "people", label: "People", href: "/reports?category=Staff%20%26%20attendance", items: [{ label: "Staff", href: "/reports?category=Staff%20%26%20attendance" }, { label: "Attendance", href: "/reports?category=Staff%20%26%20attendance" }, { label: "Payroll", href: "/reports?category=Payroll" }] },
      { id: "operations", label: "Operations", href: "/reports?category=Inventory%20%26%20assets", items: [{ label: "Inventory & assets", href: "/reports?category=Inventory%20%26%20assets" }, { label: "Maintenance & repairs", href: "/reports?category=Maintenance%20%26%20repair" }, { label: "Files & storage", href: "/reports?category=Files%20%26%20storage" }, { label: "Compliance · 1", href: "/reports?category=Compliance" }] },
      { id: "growth", label: "Growth", href: "/reports?category=Website%20%26%20marketing", items: [{ label: "Website", href: "/reports?category=Website%20%26%20marketing" }, { label: "Marketing", href: "/reports?category=Website%20%26%20marketing" }] },
      { id: "tools", label: "Reporting tools", href: "/reports?view=custom", items: [{ label: "Custom reports", href: "/reports?view=custom" }, { label: "Saved reports", href: "/reports?view=saved" }, { label: "Scheduled reports · 2", href: "/reports?view=scheduled" }, { label: "Export history", href: "/reports?view=exports" }] },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    description: "Workspace, email, team & roles, billing, payroll, and audit",
    accent: "ink",
    icon: Settings,
    href: "/settings/general",
    launcherGroup: "system",
    nav: [
      { id: "general", label: "General", href: "/settings/general" },
      { id: "emails", label: "Email templates", href: "/settings/emails" },
      { id: "team", label: "Team & roles", href: "/settings/team" },
      { id: "billing", label: "Billing & BIR", href: "/settings/billing" },
      { id: "payroll", label: "Payroll", href: "/settings/payroll" },
    ],
  },
  {
    id: "logs",
    name: "Logs",
    description: "System activity across the workspace",
    accent: "ink",
    icon: FileClock,
    href: "/logs",
    launcherGroup: "system",
    nav: [{ id: "logs", label: "Logs", href: "/logs" }],
  },
  {
    id: "usage",
    name: "Usage",
    description: "Storage, bandwidth, seats and quotas",
    accent: "ink",
    icon: Gauge,
    href: "/usage",
    launcherGroup: "system",
    nav: [{ id: "usage", label: "Usage", href: "/usage" }],
  },

  {
    id: "client-portal",
    name: "Client Portal",
    description: "External gallery, selects, invoices and feedback",
    accent: "orange",
    icon: Camera,
    href: "/client-portal",
    nav: [
      { id: "portal", label: "Client Portal", href: "/client-portal" },
    ],
  },

  // ── Not tiled on the launcher (reached via Help, avatar menu, ⌘K) ──
  {
    id: "feedback",
    name: "Feedback",
    description: "Report a problem or suggest an improvement",
    accent: "ink",
    icon: MessageSquareWarning,
    href: "/feedback/report",
    nav: [
      { id: "report", label: "Report a problem", href: "/feedback/report" },
      { id: "myreports", label: "My reports", href: "/feedback/myreports" },
    ],
  },
  {
    id: "profile",
    name: "Account",
    description: "Identity and security",
    accent: "indigo",
    icon: CircleUserRound,
    href: "/profile/me",
    nav: [
      { id: "me", label: "Profile", href: "/profile/me" },
      { id: "emergency", label: "Emergency Contact", href: "/profile/emergency" },
      { id: "security", label: "Security", href: "/profile/security" },
    ],
  },
  {
    id: "preferences",
    name: "Preferences",
    description: "Appearance and notifications",
    accent: "ink",
    icon: SlidersHorizontal,
    href: "/preferences/general",
    nav: [
      { id: "general", label: "General", href: "/preferences/general" },
      { id: "appearance", label: "Appearance", href: "/preferences/appearance" },
      { id: "notifications", label: "Notifications", href: "/preferences/notifications" },
    ],
  },
];

export const APPS_BY_ID: Record<string, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
);
