"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Ellipsis,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutList,
  LineChart,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Star,
  X,
} from "lucide-react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast/toast-provider";
import { REPORTING_BOOKINGS, REPORTING_DETAIL_ROWS, REPORTING_OVERVIEW, REPORTING_PERIOD, REPORTING_PROJECTS, REPORTING_SERVICE_REVENUE, REPORTING_STORAGE } from "@/lib/reporting-sample-data";

type Dialog = "export" | "exportAll" | "custom" | "saved" | "scheduled" | "history" | null;

const periods = ["Today", "This week", "This month", "Last month", "This quarter", "This year", "Custom range"];
const categories = [
  ["Executive", "Business performance, cash flow and exceptions", "8"],
  ["Sales", "Revenue, transactions and conversion", "13"],
  ["Bookings", "Demand, utilization and booking revenue", "13"],
  ["Projects", "Production, delivery and profitability", "14"],
  ["Tasks", "Operational work and completion", "10"],
  ["Clients & CRM", "Retention, value and communications", "12"],
  ["Financial", "Income, expenses and receivables", "14"],
  ["Invoices & payments", "Collections, aging and payment health", "11"],
  ["POS", "Retail transactions and cashier activity", "10"],
  ["Staff & attendance", "Attendance, availability and performance", "12"],
  ["Payroll", "Pay runs, deductions and remittances", "12"],
  ["Maintenance & repair", "Assets, repairs and service history", "12"],
  ["Inventory & assets", "Availability, stock and assignments", "9"],
  ["Compliance", "Permits, remittances and renewals", "11"],
  ["Files & storage", "Storage, delivery and access", "11"],
  ["Website & marketing", "Traffic, campaigns and conversion", "8"],
] as const;

const reports = [
  { name: "Business performance summary", category: "Executive", module: "Dashboard", description: "Revenue, profitability, bookings and operational exceptions in one view.", owner: "Eusebio Barrun", access: "Admin", schedule: "Monthly", refreshed: "Today, 09:12", favourite: true },
  { name: "Monthly operating report", category: "Executive", module: "Operations", description: "Monthly scorecard across studio operations, delivery and team capacity.", owner: "Eusebio Barrun", access: "Admin", schedule: "Not scheduled", refreshed: "22 Jul, 16:40", favourite: false },
  { name: "Sales target performance", category: "Sales", module: "Finance", description: "Collected sales against the calendar-month target of ₱250,000.00.", owner: "Marisol Reyes", access: "Finance", schedule: "Weekly", refreshed: "Today, 09:12", favourite: true },
  { name: "Booking conversion", category: "Bookings", module: "Booking", description: "Requested, confirmed, rescheduled and cancelled bookings by source.", owner: "Marisol Reyes", access: "Operations", schedule: "Weekly", refreshed: "Today, 09:10", favourite: false },
  { name: "Project delivery health", category: "Projects", module: "Projects", description: "Project stage, due dates, delivery progress and overdue work.", owner: "Eusebio Barrun", access: "Operations", schedule: "Weekly", refreshed: "Today, 09:08", favourite: false },
  { name: "Task completion", category: "Tasks", module: "Tasks", description: "Operational and project-linked task throughput, evidence and overdue work.", owner: "Marisol Reyes", access: "Operations", schedule: "Not scheduled", refreshed: "Today, 09:04", favourite: false },
  { name: "Accounts receivable", category: "Financial", module: "Finance", description: "Invoiced, collected, outstanding and written-off balances by client.", owner: "Eusebio Barrun", access: "Finance", schedule: "Monthly", refreshed: "Today, 09:12", favourite: true },
  { name: "Payroll register", category: "Payroll", module: "Payroll", description: "Gross pay, deductions, net pay and contribution obligations by pay run.", owner: "Eusebio Barrun", access: "Restricted", schedule: "Monthly", refreshed: "15 Jul, 16:12", favourite: false },
  { name: "Compliance status", category: "Compliance", module: "Compliance", description: "Requirements, expiring permits, fees and missing documents.", owner: "Eusebio Barrun", access: "Restricted", schedule: "Monthly", refreshed: "20 Jul, 11:30", favourite: false },
];

const chartBars = [42, 57, 49, 68, 62, 82, 74, 91, 78, 88, 69, 84];

function Button({ children, onClick, primary = false, className = "" }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-control px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-kahel-500)] ${primary ? "bg-[var(--color-kahel-500)] text-white hover:bg-[var(--color-kahel-600)]" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"} ${className}`}
    >
      {children}
    </button>
  );
}

export function ReportsHub() {
  const { fireToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState("This month");
  const [comparison, setComparison] = useState("Previous month");
  const [category, setCategory] = useState("Executive");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedReport, setSelectedReport] = useState(reports[0]);
  const [favourites, setFavourites] = useState(reports.filter((report) => report.favourite).map((report) => report.name));
  const [exportFormat, setExportFormat] = useState("XLSX");
  const validCategories: readonly string[] = categories.map(([name]) => name);
  const validViews = ["favourites", "recent", "custom", "saved", "scheduled"] as const;
  const sidebarCategory = searchParams.get("category");
  const sidebarView = searchParams.get("view");
  const safeSidebarCategory = sidebarCategory && (validCategories as readonly string[]).includes(sidebarCategory) ? sidebarCategory : null;
  const safeSidebarView = sidebarView && (validViews as readonly string[]).includes(sidebarView) ? sidebarView : null;
  const activeCategory = safeSidebarCategory ?? category;

  const sales = REPORTING_OVERVIEW.netRevenue;
  const expenses = REPORTING_OVERVIEW.expenses;
  const availableReports = reports.filter((report) => (activeCategory === "All" || report.category === activeCategory) && report.name.toLowerCase().includes(query.toLowerCase()));
  const salesTargetMet = REPORTING_OVERVIEW.salesTargetProgress >= 100;

  function openReport(report: (typeof reports)[number]) {
    setSelectedReport(report);
    fireToast(`${report.name} refreshed for ${period}.`, "info");
    document.getElementById("report-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runExport(name: string) {
    setDialog(null);
    fireToast(`${name} is being prepared as ${exportFormat}. You will be notified when it is ready.`, "info");
  }

  if (safeSidebarCategory || safeSidebarView) {
    return <ReportDestination category={safeSidebarCategory} view={safeSidebarView} onBack={() => router.push("/reports")} onExport={() => setDialog("export")} />;
  }

  return (
    <div className="min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <BarChart3 className="h-3.5 w-3.5 text-[var(--color-kahel-500)]" /> Reporting workspace
          </div>
          <h1 className="mt-2 font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">Reports</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">View, analyze and export reports across Kahel Studio OS.</p>
          <div className="mt-2 inline-flex rounded-pill bg-[var(--color-info-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-info-text)]">Sample data · Live integrations not connected</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("saved")}><Star className="h-4 w-4" /> Saved reports</Button>
          <Button onClick={() => setDialog("scheduled")}><Clock3 className="h-4 w-4" /> Scheduled</Button>
          <Button onClick={() => setDialog("history")}><LayoutList className="h-4 w-4" /> Export history</Button>
          <Button primary onClick={() => setDialog("custom")}><FilePlus2 className="h-4 w-4" /> Create custom report</Button>
          <Button onClick={() => setDialog("exportAll")}><Download className="h-4 w-4" /> Export all</Button>
        </div>
      </header>

      <section className="sticky top-0 z-20 mt-7 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_5px_18px_-14px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span>{period} · 1–31 Jul 2026</span><ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
          </div>
          <div className="hidden items-center gap-1 rounded-control bg-[var(--color-surface-muted)] p-1 lg:flex">
            {periods.slice(0, 6).map((item) => (
              <button key={item} onClick={() => setPeriod(item)} className={`h-8 rounded-[6px] px-2.5 text-xs font-semibold ${period === item ? "bg-[var(--color-surface)] text-[var(--color-kahel-700)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}>{item}</button>
            ))}
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]"><Filter className="h-4 w-4" /> Filters <span className="rounded-pill bg-[var(--color-kahel-100)] px-1.5 text-[11px] text-[var(--color-kahel-700)]">3</span></button>
          <Button primary onClick={() => fireToast(`Applied filters for ${period}.`, "success")}>Apply filters</Button>
        </div>
        {filtersOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-3 sm:grid-cols-3 xl:grid-cols-7">
            {["Compare: " + comparison, category, "Module: All", "Staff: All", "Client: All", "Booking type: All", "Status: All", "Payment: All", "Location: Main studio"].map((filter, fi) => (
              <button key={fi} onClick={fi === 1 ? () => { const i = categories.findIndex(([c]) => c === category); setCategory(categories[(i + 1) % categories.length][0]); } : undefined} className="flex h-10 items-center justify-between rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-left text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"><span className="truncate">{fi === 1 ? "Category: " + filter : filter}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></button>
            ))}
            <button onClick={() => { setComparison("Previous month"); setCategory("Executive"); setPeriod("This month"); fireToast("Report filters reset."); }} className="inline-flex h-10 items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-kahel-700)]"><RotateCcw className="h-3.5 w-3.5" /> Reset filters</button>
          </div>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between"><div><h2 className="font-display text-xl font-semibold">Reporting overview</h2><p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{REPORTING_PERIOD.label} · {REPORTING_PERIOD.location} · Super Admin data scope</p></div><span className="hidden items-center gap-1.5 text-xs text-[var(--color-text-muted)] sm:flex"><RefreshCw className="h-3.5 w-3.5" /> Updated {REPORTING_PERIOD.updated}</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-10">
          <Metric label="Net revenue" value={sales} detail="Gross ₱260,250 less discounts and refunds" tone={salesTargetMet ? "success" : "orange"} />
          <Metric label="Target progress" value={`${REPORTING_OVERVIEW.salesTargetProgress}%`} detail="₱250,000 target" tone={salesTargetMet ? "success" : "orange"} progress={REPORTING_OVERVIEW.salesTargetProgress / 100} />
          <Metric label="Total bookings" value={REPORTING_OVERVIEW.totalBookings} detail={`${REPORTING_OVERVIEW.bookingConversion} conversion`} />
          <Metric label="Confirmed" value={REPORTING_OVERVIEW.confirmedBookings} detail="4 more than June" tone="success" />
          <Metric label="Active projects" value={REPORTING_OVERVIEW.activeProjects} detail="2 overdue" tone="warning" />
          <Metric label="Completed" value={REPORTING_OVERVIEW.completedProjects} detail={`${REPORTING_OVERVIEW.completionRate} completion`} tone="success" />
          <Metric label="Outstanding" value={REPORTING_OVERVIEW.outstandingBalance} detail="3 overdue invoices" tone="warning" />
          <Metric label="Expenses" value={expenses} detail="18 recorded" tone="danger" />
          <Metric label="Operating profit" value={REPORTING_OVERVIEW.operatingProfit} detail="Operational estimate · 61.2% margin" tone="success" />
          <Metric label="Attendance" value="93.6%" detail="110 scheduled workdays" tone="success" />
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-8 xl:flex-row">
        <aside className="xl:w-72 xl:shrink-0">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Report categories</h2><span className="text-xs text-[var(--color-text-muted)]">{categories.length}</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
            <button onClick={() => setCategory("All")} className={`shrink-0 rounded-control px-3 py-2 text-left text-sm font-semibold ${category === "All" ? "bg-[var(--color-kahel-500)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}>All reports</button>
            {categories.map(([name, description, count]) => <button key={name} onClick={() => setCategory(name)} className={`group flex min-w-[190px] items-center gap-2 rounded-control px-3 py-2 text-left xl:min-w-0 ${category === name ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{name}</span><span className="hidden text-[11px] leading-4 opacity-75 xl:block">{description}</span></span><span className="text-xs tabular-nums opacity-70">{count}</span></button>)}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-xl font-semibold">Report library</h2><p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Open a report to inspect its source records, filters and export options.</p></div><label className="flex h-10 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:w-72"><Search className="h-4 w-4 text-[var(--color-text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]" /></label></div>
            <div className="mt-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="hidden grid-cols-[minmax(190px,1.7fr)_0.7fr_0.6fr_0.7fr_38px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)] md:grid"><span>Report</span><span>Module</span><span>Access</span><span>Schedule</span><span /></div>
              {availableReports.length ? availableReports.map((report) => <div key={report.name} className="grid gap-3 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0 md:grid-cols-[minmax(190px,1.7fr)_0.7fr_0.6fr_0.7fr_38px] md:items-center md:px-5"><div><button onClick={() => openReport(report)} className="text-left text-sm font-semibold hover:text-[var(--color-kahel-700)]">{report.name}</button><p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{report.description}</p><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Updated {report.refreshed} · {report.owner}</p></div><span className="text-xs font-medium text-[var(--color-text-secondary)]">{report.module}</span><AccessBadge access={report.access} /><span className="text-xs text-[var(--color-text-secondary)]">{report.schedule}</span><button onClick={() => setFavourites((items) => items.includes(report.name) ? items.filter((item) => item !== report.name) : [...items, report.name])} className="rounded-control p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label={`Toggle favourite for ${report.name}`}><Star className={`h-4 w-4 ${favourites.includes(report.name) ? "fill-[var(--color-kahel-500)] text-[var(--color-kahel-500)]" : ""}`} /></button></div>) : <EmptyState />}
            </div>
          </section>

          <ReportDetail report={selectedReport} period={period} comparison={comparison} onExport={() => setDialog("export")} onSave={() => fireToast("Report configuration saved.", "success")} onSchedule={() => setDialog("scheduled")} onOpenSource={() => fireToast("Opening the corresponding Finance source records.", "info")} />
        </div>
      </div>

      {dialog && <ReportDialog kind={dialog} format={exportFormat} setFormat={setExportFormat} onClose={() => setDialog(null)} onConfirm={() => runExport(dialog === "exportAll" ? "Consolidated reporting package" : selectedReport.name)} />}
    </div>
  );
}

const destinationData: Record<string, { title: string; description: string; metrics: [string, string, string][]; columns: string[]; rows: string[][] }> = {
  Sales: { title: "Sales", description: "Revenue, discounts and refunds for the July reporting period.", metrics: [["Gross sales", "₱260,250", "28 transactions"], ["Discounts", "₱7,500", "Applied at sale"], ["Refunds", "₱4,000", "Recorded reversals"], ["Net revenue", "₱248,750", "+18% vs. June"]], columns: ["Service", "Transactions", "Gross sales", "Discounts", "Refunds", "Net revenue"], rows: REPORTING_SERVICE_REVENUE.map((s) => [s.service, s.transactions, s.gross, s.discounts, s.refunds, s.net]) },
  Financial: { title: "Quotes & finance", description: "Quoted, invoiced, collected and outstanding values are distinct.", metrics: [["Quoted value", "₱326,500", "19 quotations"], ["Accepted value", "₱241,000", "73.7% acceptance"], ["Payments received", "₱181,450", "Confirmed collections"], ["Outstanding", "₱67,300", "3 overdue invoices"]], columns: ["Aging", "Amount", "State"], rows: [["Current", "₱31,800", "Outstanding"], ["1–30 days overdue", "₱23,500", "Overdue"], ["31–60 days overdue", "₱8,000", "Overdue"], ["More than 60 days", "₱4,000", "Overdue"]] },
  Bookings: { title: "Bookings", description: "Booking statuses, sources and conversion for studio operations.", metrics: [["Total bookings", "28", "July period"], ["Confirmed", "22", "+4 vs. June"], ["Conversion", "78.6%", "Confirmed bookings"], ["Average lead time", "11 days", "Before booking"]], columns: ["Status", "Bookings", "Share"], rows: REPORTING_BOOKINGS.map((b) => [b.status, b.count, `${(Number(b.count) / 28 * 100).toFixed(1)}%`]) },
  Projects: { title: "Projects", description: "Confirmed bookings create one linked project; staff tasks remain in Tasks.", metrics: [["Active projects", "14", "5 pre, 3 production, 6 post"], ["Completed", "6", "This month"], ["Due this week", "5", "2 overdue"], ["Completion rate", "85.7%", "9.6 day average"]], columns: ["Project", "Client", "Stage", "Status", "Progress", "Due"], rows: REPORTING_PROJECTS.map((p) => [p.ref, p.client, p.stage, p.status, p.progress, p.due]) },
  Tasks: { title: "Tasks & productivity", description: "Operational and project-linked work, not employee performance rankings.", metrics: [["Created", "246", "July period"], ["Completed", "186", "88% on time"], ["In progress", "31", "12 awaiting review"], ["Overdue", "17", "8 reopened"]], columns: ["Module", "Tasks", "Context"], rows: [["Projects", "92", "Linked project work"], ["Booking", "38", "Booking operations"], ["CRM", "32", "Client follow-up"], ["Maintenance", "18", "Asset work"], ["General operations", "10", "Standalone tasks"]] },
  Payroll: { title: "Payroll", description: "Protected overview only. Individual salary and government data remain restricted.", metrics: [["Base payroll", "₱110,000", "Monthly"], ["Processed", "₱44,000", "July to date"], ["Pending cutoff", "₱66,000", "Second cutoff"], ["Exceptions", "2", "Require review"]], columns: ["Measure", "Amount", "Access"], rows: [["Approved adjustments", "₱2,100", "Authorized Admin"], ["Contributions withheld", "₱5,840", "Authorized Admin"], ["Net payroll processed", "₱39,060", "Authorized Admin"], ["Reimbursements pending", "₱3,450", "Authorized Admin"]] },
  Compliance: { title: "Compliance", description: "Sensitive documents and government identifiers are not included in this report view.", metrics: [["Active records", "34", "Compliance register"], ["Compliant", "27", "Verified"], ["Expiring in 30 days", "4", "Requires attention"], ["Overdue", "2", "Immediate action"]], columns: ["Requirement", "Owner", "Due", "Status"], rows: [["Business permit renewal", "Super Admin", "Aug 14", "Upcoming"], ["Fire-safety inspection", "Joanne", "Aug 8", "In progress"], ["Equipment insurance review", "Super Admin", "Jul 31", "Due soon"], ["Data-privacy refresher", "All staff", "Jul 28", "4 of 5 completed"]] },
  "Files & storage": { title: "Files & storage", description: "Storage values reconcile with the Usage page.", metrics: [["Storage used", REPORTING_STORAGE.used, `Of ${REPORTING_STORAGE.limit}`], ["Files uploaded", REPORTING_STORAGE.filesUploaded, "This month"], ["Archived storage", REPORTING_STORAGE.archived, "Recoverable"], ["Duplicate candidates", "76", "Review required"]], columns: ["Storage category", "Used"], rows: REPORTING_STORAGE.categories.map((c) => [c.name, c.value]) },
};

function ReportDestination({ category, view, onBack, onExport }: { category: string | null; view: string | null; onBack: () => void; onExport: () => void }) {
  const fallback = { title: category ?? "Reports", description: "This report destination is ready for its connected data source.", metrics: [["Sample data", "Unavailable", "No connected source"], ["Reporting period", REPORTING_PERIOD.label, "July 2026"]] as [string, string, string][], columns: ["Report", "State"], rows: [["Source data", "Not connected"]] };
  const data = category ? destinationData[category] ?? fallback : { ...fallback, title: view === "favourites" ? "Favourites" : view === "recent" ? "Recently viewed" : view === "custom" ? "Custom reports" : view === "saved" ? "Saved reports" : view === "scheduled" ? "Scheduled reports" : "Export history", description: "Reporting tools use the current user’s permitted data scope." };
  return <div className="min-w-0 p-5 pb-14 sm:p-8 lg:p-10"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Reports / {data.title}</div><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-[32px] font-semibold tracking-[-0.025em]">{data.title}</h1><p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">{data.description}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">Sample data · {REPORTING_PERIOD.label} · Updated {REPORTING_PERIOD.updated}</p></div><div className="flex gap-2"><Button onClick={onBack}>Reports overview</Button><Button primary onClick={onExport}><Download className="h-4 w-4" /> Export</Button></div></div><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.metrics.map(([label, value, detail]) => <Metric key={label} label={label} value={value} detail={detail} />)}</div><div className="mt-7 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="min-w-[620px]"><div className="grid gap-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]" style={{ gridTemplateColumns: `repeat(${data.columns.length}, minmax(0, 1fr))` }}>{data.columns.map((column) => <span key={column}>{column}</span>)}</div>{data.rows.map((row, index) => <div key={`${row[0]}-${index}`} className="grid gap-4 border-b border-[var(--color-border)] px-5 py-3.5 text-sm last:border-0" style={{ gridTemplateColumns: `repeat(${data.columns.length}, minmax(0, 1fr))` }}>{row.map((cell, cellIndex) => <span key={cellIndex} className={cellIndex === 0 ? "font-semibold" : "text-[var(--color-text-secondary)]"}>{cell}</span>)}</div>)}</div></div></div>;
}

function Metric({ label, value, detail, tone = "default", progress }: { label: string; value: string; detail: string; tone?: "default" | "orange" | "success" | "warning" | "danger"; progress?: number }) {
  const colors = { default: "text-[var(--color-text-primary)]", orange: "text-[var(--color-kahel-700)]", success: "text-[var(--color-success-text)]", warning: "text-[var(--color-warning-text)]", danger: "text-[var(--color-danger-text)]" };
  const bars = { default: "bg-[var(--color-ink-300)]", orange: "bg-[var(--color-kahel-500)]", success: "bg-[var(--color-success)]", warning: "bg-[var(--color-warning)]", danger: "bg-[var(--color-danger)]" };
  return <div className="min-h-[132px] rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">{label}</div><div className={`mt-2 font-display text-[21px] font-bold tracking-[-0.02em] tabular-nums ${colors[tone]}`}>{value}</div><div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{detail}</div>{progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]"><div className={`h-full rounded-pill ${bars[tone]}`} style={{ width: `${Math.min(progress * 100, 100)}%` }} /></div>}</div>;
}

function AccessBadge({ access }: { access: string }) {
  const restricted = access === "Restricted";
  return <span className={`inline-flex w-fit items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-semibold ${restricted ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-info-bg)] text-[var(--color-info-text)]"}`}>{restricted && <LockKeyhole className="h-3 w-3" />}{access}</span>;
}

function EmptyState() {
  return <div className="px-5 py-12 text-center"><Search className="mx-auto h-5 w-5 text-[var(--color-text-muted)]" /><div className="mt-3 font-semibold">No reports match these filters</div><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Reset a filter or create a custom report for this analysis.</p></div>;
}

function ReportDetail({ report, period, comparison, onExport, onSave, onSchedule, onOpenSource }: { report: (typeof reports)[number]; period: string; comparison: string; onExport: () => void; onSave: () => void; onSchedule: () => void; onOpenSource: () => void }) {
  return <section className="scroll-mt-24 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]" id="report-detail">
    <div className="flex flex-col gap-4 border-b border-[var(--color-border)] p-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-kahel-700)]"><BarChart3 className="h-3.5 w-3.5" /> REPORT DETAIL</div><h2 className="mt-2 font-display text-2xl font-semibold">{report.name}</h2><p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">{report.description}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium">{period} · 1–31 Jul 2026</span><span className="rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium">Compared with {comparison.toLowerCase()}</span><span className="rounded-pill bg-[var(--color-info-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-info-text)]">Sample data</span></div></div><div className="flex flex-wrap gap-2"><Button onClick={onSave}><Star className="h-4 w-4" /> Save</Button><Button onClick={onSchedule}><Send className="h-4 w-4" /> Schedule</Button><Button primary onClick={onExport}><Download className="h-4 w-4" /> Export</Button></div></div>
    <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]"><div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniKpi label="Net revenue" value="₱248,750.00" change="+18.0%" good /><MiniKpi label="Payments received" value="₱181,450.00" change="Confirmed collections" good /><MiniKpi label="Outstanding" value="₱67,300.00" change="3 overdue invoices" /><MiniKpi label="Operating profit" value="₱152,300.00" change="Operational estimate" good /></div><div className="mt-5 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold">Revenue and collections</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Monthly collected revenue · current year</div></div><button className="rounded-control p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]" aria-label="Chart options"><Ellipsis className="h-4 w-4" /></button></div><div className="mt-5 flex h-44 items-end gap-2" role="img" aria-label="Monthly collected revenue bar chart, highest value in August"><div className="flex h-full w-8 flex-col justify-between text-[10px] text-[var(--color-text-muted)]"><span>₱150k</span><span>₱75k</span><span>₱0</span></div><div className="flex h-full flex-1 items-end justify-between gap-1.5 border-b border-[var(--color-border)]">{chartBars.map((height, index) => <button key={index} className="group flex h-full flex-1 items-end" aria-label={`${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index]}: ${height}% of scale`}><span className={`w-full rounded-t-sm ${index === 6 ? "bg-[var(--color-kahel-500)]" : "bg-[var(--color-ink-300)] group-hover:bg-[var(--color-kahel-400)]"}`} style={{ height: `${height}%` }} /></button>)}</div></div><div className="ml-8 mt-2 flex justify-between text-[10px] text-[var(--color-text-muted)]"><span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span></div></div></div><div className="rounded-control border border-[var(--color-border)] p-4"><div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-[var(--color-warning-text)]" /><h3 className="text-sm font-semibold">Operational exceptions</h3><span className="ml-auto rounded-pill bg-[var(--color-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-warning-text)]">3</span></div><div className="mt-3 space-y-3"><Exception title="3 invoices are overdue" description="₱67,300.00 remains outstanding." action="Review invoices" /><Exception title="Two projects are overdue" description="Review post-production delivery dates." action="Open projects" /><Exception title="One scheduled backup failed" description="Review the provider backup status." action="Review usage" /></div></div></div>
    <div className="border-t border-[var(--color-border)]"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h3 className="font-display text-lg font-semibold">Underlying records</h3><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Shared July sample records used by related sales, finance and project reports.</p></div><button onClick={onOpenSource} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-kahel-700)] hover:text-[var(--color-kahel-600)]">Open source records <ExternalLink className="h-3.5 w-3.5" /></button></div><div className="overflow-x-auto"><div className="min-w-[690px]"><div className="grid grid-cols-[0.9fr_1.7fr_0.8fr_0.9fr_0.8fr] gap-4 border-y border-[var(--color-border)] bg-[var(--color-canvas)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]"><span>Reference</span><span>Record</span><span>Method</span><span>Date</span><span className="text-right">Collected</span></div>{REPORTING_DETAIL_ROWS.map((sale) => <button key={sale.ref} onClick={onOpenSource} className="grid w-full grid-cols-[0.9fr_1.7fr_0.8fr_0.9fr_0.8fr] gap-4 border-b border-[var(--color-border)] px-5 py-3.5 text-left text-sm hover:bg-[var(--color-canvas)]"><span className="text-xs font-medium">{sale.ref}</span><span className="font-medium">{sale.description}</span><span className="text-[var(--color-text-secondary)]">{sale.method}</span><span className="text-[var(--color-text-secondary)]">{sale.date}</span><span className="text-right font-semibold tabular-nums text-[var(--color-success-text)]">{sale.amount}</span></button>)}</div></div></div>
  </section>;
}

function MiniKpi({ label, value, change, good = false }: { label: string; value: string; change: string; good?: boolean }) {
  return <div className="rounded-control border border-[var(--color-border)] p-3"><div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">{label}</div><div className="mt-1.5 text-sm font-bold tabular-nums">{value}</div><div className={`mt-1 text-[11px] font-semibold ${good ? "text-[var(--color-success-text)]" : "text-[var(--color-text-muted)]"}`}>{change}</div></div>;
}

function Exception({ title, description, action }: { title: string; description: string; action: string }) {
  return <div className="border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"><div className="text-sm font-semibold">{title}</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{description}</div><button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-kahel-700)]">{action} <ChevronRight className="h-3 w-3" /></button></div>;
}

function ReportDialog({ kind, format, setFormat, onClose, onConfirm }: { kind: Exclude<Dialog, null>; format: string; setFormat: (format: string) => void; onClose: () => void; onConfirm: () => void }) {
  const content = {
    export: { title: "Export report", description: "The export includes the current reporting period, applied filters and your permitted data scope.", action: "Prepare export" },
    exportAll: { title: "Export all reports", description: "Create one consolidated package. Restricted reports are excluded automatically.", action: "Prepare package" },
    custom: { title: "Create custom report", description: "Choose a source and valid fields. Permission and source-module rules are applied automatically.", action: "Create report" },
    saved: { title: "Saved reports", description: "Your saved configurations are private unless you share them internally.", action: "Open saved report" },
    scheduled: { title: "Scheduled reports", description: "Reports are delivered only to recipients with the required source permissions.", action: "Save schedule" },
    history: { title: "Export history", description: "Expired files are unavailable and sensitive exports are recorded in the audit log.", action: "Close" },
  }[kind];
  const setup = kind === "export" || kind === "exportAll" || kind === "custom" || kind === "scheduled";
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title"><div className="w-full max-w-xl rounded-t-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:rounded-card"><div className="flex items-start justify-between border-b border-[var(--color-border)] p-5"><div><h2 id="report-dialog-title" className="font-display text-xl font-semibold">{content.title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{content.description}</p></div><button onClick={onClose} className="rounded-control p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5">{setup ? <><div className="grid gap-3 sm:grid-cols-2"><Select label={kind === "custom" ? "Source module" : "File format"} value={kind === "custom" ? "Finance" : format} options={kind === "custom" ? ["Finance", "Bookings", "Projects", "Tasks"] : ["XLSX", "PDF", "CSV", "Print"]} onChange={setFormat} /><Select label={kind === "scheduled" ? "Delivery schedule" : "Report scope"} value={kind === "scheduled" ? "Monthly" : "Complete report"} options={kind === "scheduled" ? ["Daily", "Weekly", "Monthly", "Quarterly"] : ["Current view", "Complete report", "Summary only"]} onChange={() => undefined} /></div><div className="grid gap-3 sm:grid-cols-2"><Select label={kind === "custom" ? "Dimensions" : "Detail"} value={kind === "custom" ? "Month and service" : "Full detail"} options={kind === "custom" ? ["Month and service", "Client and service", "Staff member"] : ["Summary only", "Full detail"]} onChange={() => undefined} /><Select label={kind === "scheduled" ? "Recipients" : "Include"} value={kind === "scheduled" ? "Admins only" : "Filters and comparison"} options={kind === "scheduled" ? ["Admins only", "Finance team", "Custom recipients"] : ["Filters and comparison", "Charts", "Selected columns"]} onChange={() => undefined} /></div><label className="flex items-center gap-3 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm"><input type="checkbox" defaultChecked className="accent-[var(--color-kahel-500)]" /> Include applied filters and reporting period</label>{kind === "exportAll" && <div className="rounded-control border border-[var(--color-border)] p-3 text-sm"><div className="font-semibold">Included categories</div><div className="mt-2 flex flex-wrap gap-2">{["Executive", "Sales", "Bookings", "Financial", "Projects"].map((name) => <span key={name} className="rounded-pill bg-[var(--color-kahel-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-kahel-700)]">{name}</span>)}</div></div>}</> : <HistoryContent kind={kind} />}</div><div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-5"><Button onClick={onClose}>Cancel</Button><Button primary onClick={kind === "history" ? onClose : onConfirm}>{kind === "history" ? content.action : <><Download className="h-4 w-4" /> {content.action}</>}</Button></div></div></div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-primary)]">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function HistoryContent({ kind }: { kind: "saved" | "scheduled" | "history" }) {
  if (kind === "saved") return <div className="space-y-2"><Row icon={<Star className="h-4 w-4" />} title="Business performance summary" detail="Saved today · Shared with Admins" state="Current" /><Row icon={<LineChart className="h-4 w-4" />} title="Accounts receivable - monthly" detail="Saved 18 Jul · Finance scope" state="Current" /></div>;
  if (kind === "scheduled") return <div className="space-y-2"><Row icon={<Send className="h-4 w-4" />} title="Monthly operating report" detail="Monthly · Next delivery 01 Aug, 08:00" state="Active" /><Row icon={<Clock3 className="h-4 w-4" />} title="Sales target performance" detail="Weekly · Delivered to Finance team" state="Active" /></div>;
  return <div className="space-y-2"><Row icon={<FileSpreadsheet className="h-4 w-4" />} title="Business performance summary.xlsx" detail="Eusebio Barrun · Generated today, 09:18 · Expires 31 Jul" state="Ready" /><Row icon={<FileText className="h-4 w-4" />} title="Payroll register.pdf" detail="Eusebio Barrun · Generated 15 Jul · Sensitive export" state="Expired" /></div>;
}

function Row({ icon, title, detail, state }: { icon: React.ReactNode; title: string; detail: string; state: string }) {
  return <div className="flex items-center gap-3 rounded-control border border-[var(--color-border)] p-3"><span className="text-[var(--color-kahel-500)]">{icon}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{title}</div><div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{detail}</div></div><span className={`rounded-pill px-2 py-1 text-[11px] font-semibold ${state === "Expired" ? "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" : "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"}`}>{state}</span></div>;
}
