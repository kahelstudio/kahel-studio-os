export const MESSAGE_STATUSES = ["all", "queued", "processing", "accepted", "deferred", "delivered", "failed", "bounced", "complained", "cancelled"] as const;

export type MessageStatusFilter = (typeof MESSAGE_STATUSES)[number];
export type MessageFilters = { query: string; status: MessageStatusFilter; template: string; from: string; to: string };
export type MessagePermissionContext = { role: "super_admin" | "admin" | "staff"; permissions: string[] };

export function canAccessMessages(principal: MessagePermissionContext) {
  return principal.role === "admin" || principal.role === "super_admin" || principal.permissions.some((permission) => ["bookings.manage", "galleries.read", "loyalty.read"].includes(permission));
}

export type TransactionalMessage = {
  id: string;
  templateId: string | null;
  templateKey: string;
  recipient: string;
  recipientName: string | null;
  subject: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  htmlBody: string | null;
  textBody: string | null;
  clientId: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  projectId: string | null;
  projectReference: string | null;
  paymentId: string | null;
  galleryId: string | null;
  attempts: MessageAttempt[];
  events: MessageEvent[];
};

export type MessageAttempt = { id: string; messageId: string; status: string; providerMessageId: string | null; error: string | null; attemptedAt: string };
export type MessageEvent = { id: string; messageId: string; type: string; occurredAt: string; detail: string | null };

export function parseMessageFilters(input: Record<string, string | string[] | undefined>, forcedStatus?: MessageStatusFilter): MessageFilters {
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const statusValue = forcedStatus ?? one(input.status).toLowerCase();
  return {
    query: one(input.q).trim().slice(0, 200),
    status: MESSAGE_STATUSES.includes(statusValue as MessageStatusFilter) ? statusValue as MessageStatusFilter : "all",
    template: one(input.template).trim().slice(0, 100),
    from: validDate(one(input.from)),
    to: validDate(one(input.to)),
  };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function manilaDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function canReadMessage(message: TransactionalMessage, principal: MessagePermissionContext) {
  if (principal.role === "admin" || principal.role === "super_admin") return true;
  if ((message.bookingId || message.paymentId || message.clientId) && principal.permissions.includes("bookings.manage")) return true;
  if ((message.galleryId || message.projectId) && principal.permissions.includes("galleries.read")) return true;
  return message.templateKey.startsWith("loyalty") && principal.permissions.includes("loyalty.read");
}

export function filterMessages(messages: TransactionalMessage[], filters: MessageFilters) {
  const query = filters.query.toLocaleLowerCase();
  return messages.filter((message) => {
    if (filters.status !== "all" && message.status.toLowerCase() !== filters.status) return false;
    if (filters.template && message.templateKey !== filters.template && message.templateId !== filters.template) return false;
    const date = manilaDate(message.createdAt);
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;
    if (!query) return true;
    return [message.id, message.recipient, message.recipientName, message.subject, message.templateKey, message.bookingReference, message.projectReference]
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function messageSummary(messages: TransactionalMessage[], now = new Date()) {
  const today = manilaDate(now.toISOString());
  const sentToday = messages.filter((item) => item.sentAt && manilaDate(item.sentAt) === today).length;
  const delivered = messages.filter((item) => item.status === "delivered").length;
  const failed = messages.filter((item) => ["failed", "bounced", "complained"].includes(item.status)).length;
  const completed = delivered + failed;
  return { total: messages.length, sentToday, delivered, failed, deliveryRate: completed ? Math.round(delivered / completed * 1000) / 10 : 0 };
}

export function sanitizeEmailPreview(html: string) {
  let safe = html
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|iframe|object|embed|form|input|button|video|audio|source|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|iframe|object|embed|form|input|button|video|audio|source|link|meta|base)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:srcdoc|nonce|integrity)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|poster|background)\s*=\s*(["'])([\s\S]*?)\2/gi, (_match, attribute: string, quote: string, value: string) => {
      const normalized = value.trim().replace(/&colon;/gi, ":");
      if (attribute.toLowerCase() === "href") return ` href="#" data-masked-link="true" aria-label="External link blocked in preview"`;
      return /^(?:data:image\/(?:png|gif|jpe?g|webp);base64,)/i.test(normalized) ? ` ${attribute}=${quote}${normalized}${quote}` : ` data-blocked-${attribute}="remote-resource"`;
    })
    .replace(/url\s*\(\s*(['"]?)(?!data:)[^)]+\1\s*\)/gi, "none");
  const policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  safe = `<meta http-equiv="Content-Security-Policy" content="${policy}"><style>html{color-scheme:light}body{margin:0;overflow-wrap:anywhere}a[data-masked-link]{cursor:not-allowed;text-decoration:line-through}</style>${safe}`;
  return safe;
}
