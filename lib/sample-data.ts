// Sample data ported verbatim from the Kahel Studio OS design prototype
// (Kahel Studio OS.dc.html) so every screen reads from one consistent set
// of clients, bookings, and figures. Swap for Supabase queries later —
// keep the shapes stable so that swap stays mechanical.

export type BookingStatusId =
  | "inquiry"
  | "quoted"
  | "confirmed"
  | "progress"
  | "completed"
  | "cancelled";

export const BOOKING_STATUS: Record<BookingStatusId, { label: string; bg: string; text: string }> = {
  inquiry: { label: "Inquiry", bg: "#F1EFEC", text: "#6E6963" },
  quoted: { label: "Quoted", bg: "#E3EDFF", text: "#053799" },
  confirmed: { label: "Confirmed", bg: "#E0F7EC", text: "#005430" },
  progress: { label: "In progress", bg: "#FFE3D4", text: "#B33800" },
  completed: { label: "Completed", bg: "#E0F7F8", text: "#00575C" },
  cancelled: { label: "Cancelled", bg: "#FDE4EA", text: "#8A0625" },
};

export type AccountType = "Corporate" | "Consumer";

export interface Contact {
  ini: string;
  name: string;
  tag: string;
  email: string;
}

export interface AccountPayment {
  label: string;
  date: string;
  method: string;
  amount: string;
}

export interface AccountBookingRef {
  ref: string;
  type: string;
  date: string;
  status: BookingStatusId;
  total: string;
}

export interface Account {
  id: string;
  name: string;
  ini: string;
  type: AccountType;
  accent: "indigo" | "ink";
  source: string;
  last: string;
  ltv: string;
  phone: string;
  referredBy?: string;
  since?: string;
  nextAction?: { label: string; due: string };
  bookings: AccountBookingRef[];
  payments: AccountPayment[];
  contacts: Contact[];
  notes: string;
  identity: {
    primaryMobile: string;
    primaryVerified: boolean;
    altMobile?: string;
    clientId: string;
    numberHistory: { number: string; note: string }[];
  };
}

export const ACCOUNTS: Account[] = [
  {
    id: "bianca-marco-deveza",
    name: "Bianca & Marco Deveza",
    ini: "B&M",
    type: "Consumer",
    accent: "indigo",
    source: "Referral",
    last: "12 Jun 2026",
    ltv: "₱214,000",
    phone: "+63 917 555 0142",
    referredBy: "Ayala Land Premier",
    since: "Mar 2026",
    nextAction: { label: "Send album proof for approval", due: "Due today" },
    bookings: [
      { ref: "KS-2026-0142", type: "Wedding — Full Day", date: "09 Aug 2026", status: "confirmed", total: "₱185,000" },
      { ref: "KS-2025-0088", type: "Prenup / Engagement", date: "14 Mar 2026", status: "completed", total: "₱29,000" },
    ],
    payments: [
      { label: "Deposit — Wedding", date: "20 Jun 2026", method: "PayMongo", amount: "₱92,500" },
      { label: "Prenup — Paid in full", date: "01 Mar 2026", method: "Cash", amount: "₱29,000" },
    ],
    contacts: [
      { ini: "BD", name: "Bianca Deveza", tag: "Primary · Subject", email: "bianca.d@gmail.com" },
      { ini: "MD", name: "Marco Deveza", tag: "Billing", email: "marco.deveza@gmail.com" },
    ],
    notes:
      "Prefers weekend sessions. Marco handles billing. Wants matte prints, no gloss. Anniversary shoot likely Q1 2027 — follow up December.",
    identity: {
      primaryMobile: "+63 917 555 0142",
      primaryVerified: true,
      altMobile: "+63 918 220 4471",
      clientId: "CLI-8f3a·b7d2·4e10",
      numberHistory: [
        { number: "+63 917 555 0142", note: "current since 12 Mar 2026" },
        { number: "+63 906 210 8890", note: "replaced 12 Mar 2026" },
      ],
    },
  },
  {
    id: "ayala-land-premier",
    name: "Ayala Land Premier",
    ini: "AL",
    type: "Corporate",
    accent: "ink",
    source: "Website",
    last: "02 Jul 2026",
    ltv: "₱486,000",
    phone: "+63 917 •••• 0330",
    since: "Jan 2025",
    bookings: [
      { ref: "KS-2026-0138", type: "Corporate Headshots", date: "22 Jul 2026", status: "progress", total: "₱96,000" },
    ],
    payments: [{ label: "Corporate Headshots — Deposit", date: "10 Jul 2026", method: "Bank transfer", amount: "₱48,000" }],
    contacts: [{ ini: "RC", name: "Rosa Castillo", tag: "Billing", email: "rosa.castillo@ayalaland.com.ph" }],
    notes: "Standing corporate account. Invoices net-30. Coordinates via Rosa for all shoot scheduling.",
    identity: {
      primaryMobile: "+63 917 •••• 0330",
      primaryVerified: true,
      clientId: "CLI-2c91·aa04·77e2",
      numberHistory: [{ number: "+63 917 •••• 0330", note: "current since 14 Jan 2025" }],
    },
  },
  {
    id: "solaire-resort-casino",
    name: "Solaire Resort & Casino",
    ini: "SR",
    type: "Corporate",
    accent: "ink",
    source: "Referral",
    last: "18 May 2026",
    ltv: "₱372,000",
    phone: "+63 918 •••• 7712",
    since: "Sep 2024",
    bookings: [
      { ref: "KS-2026-0079", type: "Event Coverage", date: "18 May 2026", status: "completed", total: "₱120,000" },
    ],
    payments: [{ label: "Event Coverage — Paid in full", date: "20 May 2026", method: "Bank transfer", amount: "₱120,000" }],
    contacts: [{ ini: "JT", name: "Jerome Tan", tag: "Events", email: "jerome.tan@solaire.com.ph" }],
    notes: "Books quarterly event coverage. Prefers same lead photographer each time.",
    identity: {
      primaryMobile: "+63 918 •••• 7712",
      primaryVerified: true,
      clientId: "CLI-511f·9c3d·2a88",
      numberHistory: [{ number: "+63 918 •••• 7712", note: "current since 02 Sep 2024" }],
    },
  },
  {
    id: "reyes-family",
    name: "Reyes Family",
    ini: "RF",
    type: "Consumer",
    accent: "indigo",
    source: "Instagram",
    last: "—",
    ltv: "₱28,000",
    phone: "+63 926 •••• 4418",
    since: "Jul 2026",
    nextAction: { label: "Follow up on quote", due: "Due today" },
    bookings: [{ ref: "KS-2026-0151", type: "Birthday / Christening", date: "26 Jul 2026", status: "quoted", total: "₱28,000" }],
    payments: [],
    contacts: [{ ini: "MR", name: "Marisol Reyes", tag: "Primary", email: "marisol.reyes@gmail.com" }],
    notes: "Enquired via Instagram DM. Birthday and christening combined session for their daughter.",
    identity: {
      primaryMobile: "+63 926 •••• 4418",
      primaryVerified: false,
      clientId: "CLI-7710·e4b1·905c",
      numberHistory: [{ number: "+63 926 •••• 4418", note: "current since 18 Jul 2026" }],
    },
  },
  {
    id: "globe-telecom",
    name: "Globe Telecom",
    ini: "GL",
    type: "Corporate",
    accent: "ink",
    source: "LinkedIn",
    last: "—",
    ltv: "—",
    phone: "+63 917 •••• 1900",
    since: "Jul 2026",
    nextAction: { label: "Send product shoot proposal", due: "3 days cold" },
    bookings: [{ ref: "KS-2026-0155", type: "Product / E-commerce", date: "30 Jul 2026", status: "inquiry", total: "—" }],
    payments: [],
    contacts: [{ ini: "PC", name: "Patricia Chua", tag: "Marketing", email: "patricia.chua@globe.com.ph" }],
    notes: "Product shoot inquiry for e-commerce catalog. Awaiting proposal sign-off.",
    identity: {
      primaryMobile: "+63 917 •••• 1900",
      primaryVerified: false,
      clientId: "CLI-3b6a·1d09·f421",
      numberHistory: [{ number: "+63 917 •••• 1900", note: "current since 16 Jul 2026" }],
    },
  },
  {
    id: "aria-josh-lim",
    name: "Aria & Josh Lim",
    ini: "A&J",
    type: "Consumer",
    accent: "indigo",
    source: "Referral",
    last: "28 Jun 2026",
    ltv: "₱42,000",
    phone: "+63 995 •••• 2261",
    since: "Jun 2026",
    bookings: [{ ref: "KS-2026-0149", type: "Prenup / Engagement", date: "02 Aug 2026", status: "confirmed", total: "₱42,000" }],
    payments: [{ label: "Deposit — Prenup", date: "28 Jun 2026", method: "GCash", amount: "₱21,000" }],
    contacts: [{ ini: "AL", name: "Aria Lim", tag: "Primary · Subject", email: "aria.lim@gmail.com" }],
    notes: "Referred by a past wedding client. Engagement shoot booked ahead of a 2027 wedding date.",
    identity: {
      primaryMobile: "+63 995 •••• 2261",
      primaryVerified: true,
      clientId: "CLI-90ad·2f7c·116b",
      numberHistory: [{ number: "+63 995 •••• 2261", note: "current since 28 Jun 2026" }],
    },
  },
];

export const ACCOUNTS_BY_ID: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.id, a])
);

// ── CRM follow-up queue ─────────────────────────────────────────────
export const CRM_NO_ACTION = [
  { ini: "GL", name: "Globe Telecom", meta: "Product shoot inquiry · KS-2026-0155", age: "3 days cold" },
  { ini: "CT", name: "Carla Tan", meta: "Prenup enquiry via Instagram DM", age: "2 days cold" },
];

export const CRM_DUE_TODAY = [
  { ini: "B&M", name: "Bianca & Marco", meta: "Wedding · KS-2026-0142", action: "Send album proof" },
  { ini: "RF", name: "Reyes Family", meta: "Birthday · KS-2026-0151", action: "Follow up on quote" },
];

// ── Bookings ─────────────────────────────────────────────────────────
export interface BookingRow {
  ref: string;
  accountId: string;
  account: string;
  type: string;
  date: string;
  status: BookingStatusId;
  total: string;
  sessionDetails?: {
    dateTime: string;
    location: string;
    sessionType: string;
    balanceDueOn: string;
  };
  payment?: { total: string; deposit: string; balance: string };
  auditLog?: { text: string; when: string; dot: string }[];
  linkedProjectRef?: string;
}

export const BOOKINGS: BookingRow[] = [
  {
    ref: "KS-2026-0142",
    accountId: "bianca-marco-deveza",
    account: "Bianca & Marco Deveza",
    type: "Wedding — Full Day",
    date: "09 Aug 2026",
    status: "confirmed",
    total: "₱185,000",
    sessionDetails: {
      dateTime: "09 Aug 2026 · 8:00 AM–10:00 PM",
      location: "Fairmont Makati",
      sessionType: "Wedding — Full Day",
      balanceDueOn: "26 Jul 2026",
    },
    payment: { total: "₱185,000.00", deposit: "₱92,500.00", balance: "₱92,500.00" },
    linkedProjectRef: "PRJ-2026-0142",
    auditLog: [
      { text: "Booking confirmed · deposit invoice sent", when: "20 Jun 2026 · 10:04", dot: "#00A15C" },
      { text: "Quote sent to Bianca & Marco Deveza", when: "15 Jun 2026 · 14:20", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "10 Jun 2026 · 09:11", dot: "#9B9691" },
      { text: "Inquiry received via referral", when: "08 Jun 2026 · 17:45", dot: "#9B9691" },
    ],
  },
  {
    ref: "KS-2026-0151",
    accountId: "reyes-family",
    account: "Reyes Family",
    type: "Birthday / Christening",
    date: "26 Jul 2026",
    status: "quoted",
    total: "₱28,000",
    sessionDetails: {
      dateTime: "26 Jul 2026 · 2:00–5:00 PM",
      location: "Studio A, BGC",
      sessionType: "Birthday / Christening",
      balanceDueOn: "24 Jul 2026",
    },
    payment: { total: "₱28,000.00", deposit: "₱14,000.00", balance: "₱14,000.00" },
    auditLog: [
      { text: "Quote sent to Reyes Family", when: "21 Jul 2026 · 09:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "19 Jul 2026 · 16:40", dot: "#9B9691" },
      { text: "Inquiry received via Instagram", when: "18 Jul 2026 · 11:15", dot: "#9B9691" },
    ],
  },
  {
    ref: "KS-2026-0138",
    accountId: "ayala-land-premier",
    account: "Ayala Land Premier",
    type: "Corporate Headshots",
    date: "22 Jul 2026",
    status: "progress",
    total: "₱96,000",
    sessionDetails: {
      dateTime: "22 Jul 2026 · 9:00 AM–1:00 PM",
      location: "Ayala Land Premier HQ",
      sessionType: "Corporate Headshots",
      balanceDueOn: "22 Jul 2026",
    },
    payment: { total: "₱96,000.00", deposit: "₱48,000.00", balance: "₱48,000.00" },
    linkedProjectRef: "PRJ-2026-0138",
    auditLog: [
      { text: "Corporate Headshots in progress", when: "22 Jul 2026 · 09:15", dot: "#B33800" },
      { text: "Booking confirmed · deposit invoice sent", when: "10 Jul 2026 · 11:30", dot: "#00A15C" },
      { text: "Quote sent to Ayala Land Premier", when: "05 Jul 2026 · 15:02", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "02 Jul 2026 · 10:00", dot: "#9B9691" },
    ],
  },
  {
    ref: "KS-2026-0149",
    accountId: "aria-josh-lim",
    account: "Aria & Josh Lim",
    type: "Prenup / Engagement",
    date: "02 Aug 2026",
    status: "confirmed",
    total: "₱42,000",
    sessionDetails: {
      dateTime: "02 Aug 2026 · 3:00–6:00 PM",
      location: "Bonifacio High Street",
      sessionType: "Prenup / Engagement",
      balanceDueOn: "19 Jul 2026",
    },
    payment: { total: "₱42,000.00", deposit: "₱21,000.00", balance: "₱21,000.00" },
    linkedProjectRef: "PRJ-2026-0149",
    auditLog: [
      { text: "Booking confirmed · deposit invoice sent", when: "28 Jun 2026 · 13:40", dot: "#00A15C" },
      { text: "Quote sent to Aria & Josh Lim", when: "26 Jun 2026 · 09:20", dot: "#0B5FFF" },
      { text: "Booking created from inquiry", when: "24 Jun 2026 · 18:05", dot: "#9B9691" },
    ],
  },
  {
    ref: "KS-2026-0155",
    accountId: "globe-telecom",
    account: "Globe Telecom",
    type: "Product / E-commerce",
    date: "30 Jul 2026",
    status: "inquiry",
    total: "—",
    auditLog: [{ text: "Inquiry received via LinkedIn", when: "16 Jul 2026 · 14:12", dot: "#9B9691" }],
  },
];

export const BOOKINGS_BY_REF: Record<string, BookingRow> = Object.fromEntries(
  BOOKINGS.map((b) => [b.ref, b])
);

export const BOOKING_STEPS_ORDER: BookingStatusId[] = [
  "inquiry",
  "quoted",
  "confirmed",
  "progress",
  "completed",
];

// ── Booking calendar (July 2026) ────────────────────────────────────
export const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CALENDAR_EVENTS: Record<number, { label: string; accent: "ink" | "orange" | "indigo" | "teal" }[]> = {
  9: [{ label: "Corporate — Globe", accent: "ink" }],
  14: [{ label: "Product — Globe", accent: "orange" }],
  21: [{ label: "Reyes quote due", accent: "orange" }],
  22: [{ label: "Headshots — Ayala", accent: "ink" }],
  26: [{ label: "Birthday — Reyes", accent: "indigo" }],
  30: [{ label: "Product — Globe", accent: "teal" }],
};

export const CALENDAR_TODAY = 21;

// ── POS ──────────────────────────────────────────────────────────────
export interface Product {
  sku: string;
  id: string;
  name: string;
  category: "Prints" | "Frames" | "Albums" | "Media";
  price: number;
  stock: number;
  swatch: string;
}

export const PRODUCTS: Product[] = [
  { sku: "PR-8X10", id: "P01", name: "8×10 Matte Print", category: "Prints", price: 180, stock: 120, swatch: "#4F3DD9" },
  { sku: "FR-1218", id: "P02", name: "Framed 12×18 (Oak)", category: "Frames", price: 1450, stock: 14, swatch: "#00A5AD" },
  { sku: "AL-30PP", id: "P03", name: "Premium Album (30pp)", category: "Albums", price: 4800, stock: 6, swatch: "#B33800" },
  { sku: "US-64GB", id: "P04", name: "USB Drive 64GB", category: "Media", price: 950, stock: 38, swatch: "#333333" },
  { sku: "CV-1620", id: "P05", name: "Canvas Wrap 16×20", category: "Frames", price: 2200, stock: 9, swatch: "#00A15C" },
  { sku: "AC-0606", id: "P06", name: "Acrylic Block 6×6", category: "Frames", price: 1350, stock: 3, swatch: "#8C2B00" },
];

export interface CatalogItem {
  code: string;
  name: string;
  detail: string;
  price: string;
  qty?: string;
}

export const POS_CATALOGS: Record<string, { title: string; sub: string; unit: string; data: CatalogItem[] }> = {
  "cat-sessions": {
    title: "Studio Sessions",
    sub: "In-studio shoots booked by the hour or package",
    unit: "Duration",
    data: [
      { code: "SS-PORT", name: "Portrait Session", detail: "1 hr · 1 look · 10 edited", price: "₱3,500" },
      { code: "SS-HEAD", name: "Corporate Headshots", detail: "30 min · 3 edited", price: "₱2,200" },
      { code: "SS-FAM", name: "Family Session", detail: "1.5 hr · up to 6 pax · 20 edited", price: "₱5,800" },
      { code: "SS-NEW", name: "Newborn / Maternity", detail: "2 hr · props included · 15 edited", price: "₱6,500" },
      { code: "SS-PROD", name: "Product Photography", detail: "Per 10 items · white bg", price: "₱4,000" },
    ],
  },
  "cat-events": {
    title: "Event Coverage",
    sub: "On-location coverage packages",
    unit: "Coverage",
    data: [
      { code: "EV-WED-F", name: "Wedding — Full Day", detail: "10 hr · 2 shooters · album", price: "₱120,000" },
      { code: "EV-WED-H", name: "Wedding — Half Day", detail: "6 hr · 1 shooter", price: "₱75,000" },
      { code: "EV-CORP", name: "Corporate Event", detail: "4 hr · same-day highlights", price: "₱38,000" },
      { code: "EV-BDAY", name: "Birthday / Christening", detail: "3 hr · 1 shooter", price: "₱18,000" },
      { code: "EV-DEBUT", name: "Debut / 18th", detail: "6 hr · 2 shooters · SDE", price: "₱55,000" },
    ],
  },
  "cat-rentals": {
    title: "Rentals",
    sub: "Gear rented per day — stock is live",
    unit: "Available",
    data: [
      { code: "RN-R5", name: "Canon EOS R5 Body", detail: "Per day · incl. 2 batteries", price: "₱2,500", qty: "3 avail" },
      { code: "RN-2470", name: "RF 24-70mm f/2.8", detail: "Per day", price: "₱1,200", qty: "2 avail" },
      { code: "RN-GODOX", name: "Godox AD600 Kit", detail: "Per day · softbox + stand", price: "₱1,500", qty: "4 avail" },
      { code: "RN-CYC", name: "Cyclorama Studio A", detail: "Per hour · white cyc", price: "₱900", qty: "Bookable" },
      { code: "RN-GIMBAL", name: "DJI RS 3 Gimbal", detail: "Per day", price: "₱1,000", qty: "1 avail" },
    ],
  },
  "cat-retail": {
    title: "Retail",
    sub: "Physical products sold at the counter",
    unit: "Stock",
    data: [
      { code: "RT-8X10", name: "8×10 Matte Print", detail: "Single print", price: "₱180", qty: "120 in stock" },
      { code: "RT-FR1218", name: "Framed 12×18 (Oak)", detail: "Ready to hang", price: "₱1,450", qty: "14 in stock" },
      { code: "RT-ALB20", name: "Layflat Album 20pg", detail: "12×12 lambskin", price: "₱6,800", qty: "6 in stock" },
      { code: "RT-USB", name: "Engraved USB + Box", detail: "32GB · wooden box", price: "₱850", qty: "40 in stock" },
      { code: "RT-CANV", name: "Canvas Wrap 16×24", detail: "Gallery wrap", price: "₱2,400", qty: "4 in stock" },
    ],
  },
  "cat-addons": {
    title: "Add-ons",
    sub: "Extras attached to a session or booking",
    unit: "Type",
    data: [
      { code: "AD-HOUR", name: "Extra Coverage Hour", detail: "Per additional hour", price: "₱4,000" },
      { code: "AD-RUSH", name: "Rush Editing (48h)", detail: "Priority turnaround", price: "₱3,000" },
      { code: "AD-MUA", name: "Hair & Makeup", detail: "Per pax · on-site", price: "₱2,500" },
      { code: "AD-DRONE", name: "Drone Coverage", detail: "Per event · licensed pilot", price: "₱6,000" },
      { code: "AD-PRINTS", name: "Extra Edited Photos", detail: "Per 10 additional", price: "₱1,500" },
    ],
  },
};

// ── Dashboard KPIs (July 2026) ───────────────────────────────────────
export const SALES_MONTHS = [
  { label: "May 2026", total: 189000 },
  { label: "June 2026", total: 275000 },
  { label: "July 2026", total: 71000 },
];

export const DASHBOARD_KPIS = [
  { label: "Revenue MTD", value: "₱412,500", delta: "▲ 18% vs Jun", positive: true },
  { label: "Gross profit", value: "₱268,100", delta: "65% margin", positive: true },
  { label: "Avg booking value", value: "₱34,375", delta: "▲ ₱2,100 vs Jun", positive: true },
  { label: "Outstanding", value: "₱71,000", delta: "3 balances due", positive: false },
];

export const REVENUE_CHART = [
  { month: "FEB", value: 238 },
  { month: "MAR", value: 296 },
  { month: "APR", value: 271 },
  { month: "MAY", value: 344 },
  { month: "JUN", value: 349 },
  { month: "JUL", value: 412 },
];

export const DASHBOARD_SCHEDULE = [
  { time: "10:00 AM", title: "Corporate Headshots — Ayala Land", sub: "Studio B · 24 subjects" },
  { time: "2:00 PM", title: "Client call — Reyes Family", sub: "Confirm birthday details" },
  { time: "4:30 PM", title: "Album review — Bianca & Marco", sub: "Final proof approval" },
];

export const DASHBOARD_BALANCES = [
  { name: "Bianca & Marco", ref: "KS-2026-0142", amount: "₱92,500" },
  { name: "Aria & Josh Lim", ref: "KS-2026-0149", amount: "₱21,000" },
  { name: "Reyes Family", ref: "KS-2026-0151", amount: "₱14,000" },
];

export const DASHBOARD_INQUIRIES = [
  { ini: "GL", name: "Globe Telecom", sub: "Product shoot · 30 Jul", when: "3d ago" },
  { ini: "CT", name: "Carla Tan", sub: "Prenup enquiry", when: "2d ago" },
  { ini: "MP", name: "Maria Pascual", sub: "Graduation portraits", when: "5h ago" },
];

// ── Finance ──────────────────────────────────────────────────────────
const FIN_KINDS: Record<string, { bg: string; c: string }> = {
  deposit: { bg: "#E3EDFF", c: "#053799" },
  balance: { bg: "#FFE3D4", c: "#B33800" },
  full: { bg: "#E0F7EC", c: "#005430" },
  retail: { bg: "#E0F7F8", c: "#00575C" },
};

export const FINANCE_KPIS = [
  { label: "Recorded MTD", value: "₱412,500" },
  { label: "Booklet remaining", value: "54 serials" },
  { label: "Unreconciled", value: "2 items" },
];

export const FINANCE_INVOICES = [
  { serial: "KS-000-1042", ref: "KS-2026-0142", kind: "deposit", amount: "₱92,500.00", issued: "20 Jun 2026" },
  { serial: "KS-000-1043", ref: "KS-2026-0149", kind: "deposit", amount: "₱21,000.00", issued: "28 Jun 2026" },
  { serial: "KS-000-1044", ref: "ORD-2026-0771", kind: "retail", amount: "₱3,350.00", issued: "12 Jul 2026" },
  { serial: "KS-000-1045", ref: "KS-2025-0088", kind: "full", amount: "₱29,000.00", issued: "01 Mar 2026" },
  { serial: "KS-000-1046", ref: "KS-2026-0138", kind: "balance", amount: "₱48,000.00", issued: "18 Jul 2026" },
].map((r) => ({
  ...r,
  kindLabel: r.kind.charAt(0).toUpperCase() + r.kind.slice(1),
  kindBg: FIN_KINDS[r.kind].bg,
  kindColor: FIN_KINDS[r.kind].c,
}));

export const FINANCE_SALES_KPIS = [
  { label: "Sales this month", value: "₱125,750" },
  { label: "Transactions", value: "27" },
  { label: "Average sale", value: "₱4,657" },
  { label: "vs. last month", value: "▲ 8%" },
];

export const FINANCE_SALES = [
  { ref: "POS-2026-0712", desc: "Prints & frames — walk-in", method: "Cash", date: "21 Jul 2026", amt: "₱3,450.00" },
  { ref: "POS-2026-0711", desc: "Package add-on — Reyes", method: "GCash", date: "20 Jul 2026", amt: "₱6,000.00" },
  { ref: "KS-2026-0149", desc: "Wedding deposit — Deveza", method: "Bank transfer", date: "28 Jun 2026", amt: "₱21,000.00" },
  { ref: "KS-2026-0142", desc: "Corporate deposit — Globe", method: "Bank transfer", date: "20 Jun 2026", amt: "₱92,500.00" },
  { ref: "POS-2026-0708", desc: "Album reprint — Santos", method: "Maya", date: "18 Jul 2026", amt: "₱2,800.00" },
];

export const FINANCE_EXPENSE_KPIS = [
  { label: "Expenses this month", value: "₱101,830" },
  { label: "Largest category", value: "Payroll" },
  { label: "Entries", value: "18" },
  { label: "vs. last month", value: "▲ 6%" },
];

const EXP_TONE: Record<string, { bg: string; c: string }> = {
  blue: { bg: "#E3EDFF", c: "#053799" },
  indigo: { bg: "#EDEAFD", c: "#2A1F87" },
  orange: { bg: "#FFF4EE", c: "#B33800" },
  teal: { bg: "#E0F7F8", c: "#00575C" },
  grey: { bg: "#F1EFEC", c: "#6E6963" },
};

export const FINANCE_EXPENSES = [
  { ref: "EXP-2026-0221", cat: "Equipment", tone: "blue", desc: "Lens rental — 70-200mm", date: "19 Jul 2026", amt: "₱4,500.00" },
  { ref: "EXP-2026-0220", cat: "Studio", tone: "indigo", desc: "Studio rent — July", date: "01 Jul 2026", amt: "₱35,000.00" },
  { ref: "EXP-2026-0219", cat: "Payroll", tone: "orange", desc: "Semi-monthly payroll — Jul A", date: "15 Jul 2026", amt: "₱47,190.00" },
  { ref: "EXP-2026-0218", cat: "Supplies", tone: "teal", desc: "Prints & framing stock", date: "12 Jul 2026", amt: "₱6,240.00" },
  { ref: "EXP-2026-0217", cat: "Utilities", tone: "grey", desc: "Electricity & internet", date: "08 Jul 2026", amt: "₱8,900.00" },
].map((r) => ({ ...r, catBg: EXP_TONE[r.tone].bg, catColor: EXP_TONE[r.tone].c }));

export const FINANCE_PAYMENT_KPIS = [
  { label: "Money in", value: "₱119,500" },
  { label: "Money out", value: "₱82,190" },
  { label: "Net movement", value: "₱37,310" },
  { label: "Pending", value: "1" },
];

export const FINANCE_PAYMENTS = [
  { ref: "PAY-IN-0342", party: "Reyes Family", dir: "in", method: "GCash ••7712", date: "20 Jul 2026", amt: "₱6,000.00", st: "cleared" },
  { ref: "PAY-OUT-0119", party: "Payroll — Jul A · 5 staff", dir: "out", method: "Bank transfer", date: "15 Jul 2026", amt: "₱47,190.00", st: "cleared" },
  { ref: "PAY-IN-0341", party: "Globe Telecom", dir: "in", method: "Bank transfer", date: "20 Jun 2026", amt: "₱92,500.00", st: "cleared" },
  { ref: "PAY-OUT-0118", party: "Studio rent — July", dir: "out", method: "Bank transfer", date: "01 Jul 2026", amt: "₱35,000.00", st: "cleared" },
  { ref: "PAY-IN-0343", party: "Deveza — balance", dir: "in", method: "Bank transfer", date: "Awaiting", amt: "₱21,000.00", st: "pending" },
].map((r) => ({
  ...r,
  dirColor: r.dir === "in" ? "#005430" : "#8A0625",
  dirSign: r.dir === "in" ? "+" : "−",
  dirBg: r.dir === "in" ? "#E0F7EC" : "#FDE4EA",
  dirLabel: r.dir === "in" ? "In" : "Out",
  stBg: r.st === "cleared" ? "#E0F7EC" : "#FDF0D5",
  stColor: r.st === "cleared" ? "#005430" : "#8A6D00",
  stLabel: r.st === "cleared" ? "Cleared" : "Pending",
}));

// ── Quotation ────────────────────────────────────────────────────────
const QUOTE_ST: Record<string, { bg: string; c: string; l: string }> = {
  draft: { bg: "#ECEAE7", c: "#4A453F", l: "Draft" },
  sent: { bg: "#E3EDFF", c: "#053799", l: "Sent" },
  accepted: { bg: "#E0F7EC", c: "#005430", l: "Accepted" },
  expired: { bg: "#FDE4EA", c: "#8A0625", l: "Expired" },
};

export const QUOTATIONS = [
  { ref: "QT-2026-0074", client: "Bianca & Marco Deveza", type: "Wedding — Full Day", total: "₱185,000", valid: "Valid to 09 Aug", st: "sent" },
  { ref: "QT-2026-0073", client: "Ayala Land Premier", type: "Corporate Headshots", total: "₱96,000", valid: "Valid to 30 Jul", st: "accepted" },
  { ref: "QT-2026-0072", client: "Reyes Family", type: "Birthday / Christening", total: "₱28,000", valid: "Valid to 26 Jul", st: "sent" },
  { ref: "QT-2026-0071", client: "Aria & Josh Lim", type: "Prenup / Engagement", total: "₱42,000", valid: "Expired 18 Jul", st: "expired" },
  { ref: "QT-2026-0070", client: "Globe Telecom", type: "Product — Half Day", total: "₱54,000", valid: "Not sent", st: "draft" },
  { ref: "QT-2026-0069", client: "Santos Wedding", type: "Wedding — Half Day", total: "₱120,000", valid: "Not sent", st: "draft" },
].map((q) => ({ ...q, stBg: QUOTE_ST[q.st].bg, stColor: QUOTE_ST[q.st].c, stL: QUOTE_ST[q.st].l }));

// ── Maintenance & repair ─────────────────────────────────────────────
const MAINT_ST: Record<string, { bg: string; c: string; l: string }> = {
  reported: { bg: "#FDE4EA", c: "#8A0625", l: "Reported" },
  inspect: { bg: "#FDF0D5", c: "#8A6D00", l: "Inspection required" },
  scheduled: { bg: "#E3EDFF", c: "#053799", l: "Scheduled" },
  inrepair: { bg: "#FFE3D4", c: "#B33800", l: "In repair" },
  awaiting: { bg: "#FDF0D5", c: "#8A6D00", l: "Awaiting parts" },
  completed: { bg: "#E0F7EC", c: "#005430", l: "Completed" },
  unrepairable: { bg: "#ECEAE7", c: "#4A453F", l: "Unrepairable" },
};

const MAINT_TASK_RAISED = ["reported", "inspect", "scheduled", "inrepair", "awaiting"];

export const MAINTENANCE_ITEMS = [
  { task: "Air-conditioner cleaning", asset: "FAC-AC-01", mtype: "Preventive", issue: "Quarterly filter & coil clean", who: "Ivy S.", next: "24 Jul 2026", recur: "Every 3 months", est: "₱2,500", warranty: "N/A", st: "scheduled" },
  { task: "Signage cleaning", asset: "FAC-SIG-01", mtype: "Cleaning", issue: "Exterior storefront signage", who: "Ivy S.", next: "02 Sep 2026", recur: "Quarterly", est: "₱800", warranty: "N/A", st: "reported" },
  { task: "Camera & lens servicing", asset: "CAM-R5-02", mtype: "Repair", issue: "Autofocus intermittent on R5 body", who: "Canon Service Center", next: "26 Jul 2026", recur: "As needed", est: "₱6,000", warranty: "In warranty", st: "inrepair" },
  { task: "Printer maintenance", asset: "IT-PR-01", mtype: "Repair", issue: "Paper feed jams, roller worn", who: "Epson Vendor", next: "—", recur: "As needed", est: "₱3,200", warranty: "Expired", st: "awaiting" },
  { task: "Lighting & electrical inspection", asset: "EQ-LT-04", mtype: "Preventive", issue: "Monthly safety inspection", who: "Rafa T.", next: "19 Jul 2026", recur: "Monthly", est: "₱0", warranty: "N/A", st: "inspect" },
  { task: "Computer & storage maintenance", asset: "IT-WS-03", mtype: "Preventive", issue: "Disk health check & backup verify", who: "Danilo C.", next: "10 Aug 2026", recur: "Monthly", est: "₱0", warranty: "N/A", st: "completed" },
  { task: "Studio deep cleaning", asset: "FAC-STU-01", mtype: "Cleaning", issue: "Full-day cyclorama & floor clean", who: "Ivy S.", next: "12 Jul 2026", recur: "Monthly", est: "₱1,500", warranty: "N/A", st: "completed" },
].map((m) => ({
  ...m,
  stBg: MAINT_ST[m.st].bg,
  stColor: MAINT_ST[m.st].c,
  stL: MAINT_ST[m.st].l,
  taskRaised: MAINT_TASK_RAISED.includes(m.st),
}));

// ── Projects ─────────────────────────────────────────────────────────
const PROJ_STAGE_META: Record<string, { label: string; bg: string; c: string }> = {
  culling: { label: "Culling", bg: "#F1EFEC", c: "#6E6963" },
  editing: { label: "Editing", bg: "#FFE3D4", c: "#B33800" },
  review: { label: "Client review", bg: "#E3EDFF", c: "#053799" },
  delivered: { label: "Delivered", bg: "#E0F7EC", c: "#005430" },
};

export const PROJECT_GROUPS = [
  {
    stage: "editing",
    items: [
      { ref: "PRJ-2026-0142", title: "Bianca & Marco — Wedding", meta: "1,240 frames · due 02 Aug", editor: "EB", booking: "From booking KS-2026-0142" },
      { ref: "PRJ-2026-0138", title: "Ayala Land — Headshots", meta: "480 frames · due 25 Jul", editor: "EB", booking: "From booking KS-2026-0138" },
    ],
  },
  {
    stage: "review",
    items: [
      { ref: "PRJ-2026-0131", title: "Solaire — Event coverage", meta: "Gallery sent · awaiting picks", editor: "JR", booking: "From booking KS-2026-0131" },
    ],
  },
  {
    stage: "culling",
    items: [
      { ref: "PRJ-2026-0151", title: "Reyes Family — Birthday", meta: "820 frames · unstarted", editor: "—", booking: "From booking KS-2026-0151" },
    ],
  },
  {
    stage: "delivered",
    items: [
      { ref: "PRJ-2025-0088", title: "Deveza — Prenup", meta: "Delivered 14 Mar · expires in 12d", editor: "EB", booking: "From booking KS-2025-0088" },
    ],
  },
].map((g) => ({
  label: PROJ_STAGE_META[g.stage].label,
  count: g.items.length,
  bg: PROJ_STAGE_META[g.stage].bg,
  color: PROJ_STAGE_META[g.stage].c,
  items: g.items,
}));

// ── Glitches ─────────────────────────────────────────────────────────
const GLITCH_ST: Record<string, { bg: string; c: string; l: string }> = {
  open: { bg: "#FDE4EA", c: "#8A0625", l: "Open" },
  progress: { bg: "#FDF0D5", c: "#8A6D00", l: "Investigating" },
  fixed: { bg: "#E0F7EC", c: "#005430", l: "Fixed" },
  closed: { bg: "#ECEAE7", c: "#4A453F", l: "Closed" },
};

const SEV_COLOR: Record<string, string> = { High: "#8A0625", Medium: "#8A6D00", Low: "#6E6963" };

export const GLITCHES = [
  { ref: "GL-0042", title: "Gallery link expired 3 days early", area: "Website · delivery", by: "Mika R.", sev: "High", when: "22 Jul · 2:14 PM", st: "progress", group: "open" },
  { ref: "GL-0041", title: "Payslip PDF fails to generate for interns", area: "Payroll · payslips", by: "Eusebio D.", sev: "High", when: "21 Jul · 9:02 AM", st: "open", group: "open" },
  { ref: "GL-0040", title: "Softbox stand snapped mid-shoot", area: "Equipment · lighting", by: "Rafa T.", sev: "Medium", when: "20 Jul · 4:47 PM", st: "progress", group: "open" },
  { ref: "GL-0037", title: "Client says delivered album missing 40 photos", area: "Complaint · delivery", by: "Front desk", sev: "High", when: "16 Jul · 11:20 AM", st: "open", group: "open" },
  { ref: "GL-0039", title: "POS serial field accepts letters", area: "POS · checkout", by: "Jules M.", sev: "Medium", when: "19 Jul · 3:35 PM", st: "fixed", group: "closed" },
  { ref: "GL-0038", title: "Cracked lens filter on 50mm kit", area: "Equipment · lenses", by: "Rafa T.", sev: "Low", when: "17 Jul · 10:08 AM", st: "fixed", group: "closed" },
  { ref: "GL-0036", title: "Client complaint: late arrival at venue", area: "Complaint · booking", by: "Front desk", sev: "High", when: "14 Jul · 5:52 PM", st: "closed", group: "closed" },
  { ref: "GL-0035", title: "Feedback form rejects long comments", area: "Feedback · report", by: "Mika R.", sev: "Low", when: "11 Jul · 1:30 PM", st: "closed", group: "closed" },
].map((g) => ({
  ...g,
  stBg: GLITCH_ST[g.st].bg,
  stColor: GLITCH_ST[g.st].c,
  stL: GLITCH_ST[g.st].l,
  sevColor: SEV_COLOR[g.sev],
}));
