export const REPORTING_PERIOD = {
  label: "1–31 Jul 2026",
  comparison: "1–30 Jun 2026",
  updated: "25 Jul 2026, 10:18 PM GST",
  business: "Kahel Studio",
  location: "Zone 1, Cobo, Tabaco City, Albay",
  currency: "PHP",
  dataStatus: "Sample data",
};

export const REPORTING_OVERVIEW = {
  grossSales: "₱0",
  discounts: "₱0",
  refunds: "₱0",
  netRevenue: "₱0",
  expenses: "₱0",
  operatingProfit: "₱0",
  outstandingBalance: "₱0",
  paymentsReceived: "₱0",
  totalBookings: "0",
  confirmedBookings: "0",
  activeProjects: "0",
  completedProjects: "0",
  averageBookingValue: "₱0",
  bookingConversion: "0%",
  completionRate: "0%",
  newClients: "0",
  returningRate: "0%",
  salesTarget: 250000,
  salesTargetProgress: 0,
};

export const REPORTING_SERVICE_REVENUE = [
  { service: "Studio portraits", transactions: "0", gross: "₱0", discounts: "₱0", refunds: "₱0", net: "₱0" },
  { service: "Events and weddings", transactions: "0", gross: "₱0", discounts: "₱0", refunds: "₱0", net: "₱0" },
  { service: "Food and commercial", transactions: "0", gross: "₱0", discounts: "₱0", refunds: "₱0", net: "₱0" },
  { service: "Corporate photo and video", transactions: "0", gross: "₱0", discounts: "₱0", refunds: "₱0", net: "₱0" },
  { service: "Equipment rental", transactions: "0", gross: "₱0", discounts: "₱0", refunds: "₱0", net: "₱0" },
];

export const REPORTING_BOOKINGS = [
  { status: "Requested", count: "0" }, { status: "Booked", count: "0" }, { status: "Confirmed", count: "0" },
  { status: "Rescheduled", count: "0" }, { status: "Cancelled", count: "0" }, { status: "No-show", count: "0" },
];

export const REPORTING_PROJECTS = [
  { ref: "KS-2026-0142", client: "Amma's Bistro", stage: "Pre-production", status: "Shot list", progress: "0%", due: "Aug 2" },
  { ref: "KS-2026-0145", client: "Bicol Medical Center", stage: "Pre-production", status: "Awaiting client approval", progress: "0%", due: "Aug 5" },
  { ref: "KS-2026-0138", client: "Cafe Basilio", stage: "Production", status: "In production", progress: "0%", due: "Jul 28" },
  { ref: "KS-2026-0139", client: "Santos wedding", stage: "Production", status: "In production", progress: "0%", due: "Aug 3" },
  { ref: "KS-2026-0126", client: "Sea & Smoke", stage: "Post-production", status: "Photo editing", progress: "0%", due: "Jul 27" },
  { ref: "KS-2026-0129", client: "Kapihan", stage: "Post-production", status: "Video editing", progress: "0%", due: "Jul 28" },
  { ref: "KS-2026-0132", client: "Cruz family", stage: "Post-production", status: "Client review", progress: "0%", due: "Jul 26" },
  { ref: "KS-2026-0135", client: "Pacific Construction", stage: "Post-production", status: "Ready for delivery", progress: "0%", due: "Jul 25" },
];

export const REPORTING_STORAGE = {
  used: "0 GB",
  limit: "1 TB",
  percentage: "0%",
  filesUploaded: "0",
  archived: "0 GB",
  categories: [
    { name: "Project photos", value: "0 GB" }, { name: "Project videos", value: "0 GB" }, { name: "Client deliverables", value: "0 GB" },
    { name: "Audio files", value: "0 GB" }, { name: "Documents and reports", value: "0 GB" }, { name: "Design files", value: "0 GB" }, { name: "Backups", value: "0 GB" },
  ],
};

export const REPORTING_DETAIL_ROWS = [
  { ref: "INV-2026-0731", description: "Santos wedding coverage", method: "Bank transfer", date: "25 Jul 2026", amount: "₱0.00" },
  { ref: "INV-2026-0724", description: "Amma's Bistro content retainer", method: "GCash", date: "24 Jul 2026", amount: "₱0.00" },
  { ref: "INV-2026-0720", description: "Bicol Medical Center interview", method: "PayMongo", date: "20 Jul 2026", amount: "₱0.00" },
  { ref: "INV-2026-0718", description: "Kapihan social content", method: "Maya", date: "18 Jul 2026", amount: "₱0.00" },
  { ref: "INV-2026-0712", description: "Cafe Basilio monthly content", method: "Cash", date: "12 Jul 2026", amount: "₱0.00" },
];
