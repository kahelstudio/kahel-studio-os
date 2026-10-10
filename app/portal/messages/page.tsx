export const dynamic = "force-dynamic";

import { getPortalMessages } from "@/lib/server/customer-portal-data";

const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));

export default async function PortalMessagesPage() {
  const messages = await getPortalMessages();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Messages</h1>
      <p className="mt-2 text-text-secondary">Updates and communications from Kahel Studio.</p>

      {messages.length ? (
        <ol className="mt-8 grid gap-3" aria-label="Messages">
          {messages.map((msg) => (
            <li key={msg.id} className={`rounded-xl border bg-surface p-5 ${!msg.readAt ? "border-kahel-300" : "border-border"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${msg.sender === "customer" ? "text-kahel-700" : "text-text-muted"}`}>
                  {msg.sender === "customer" ? "You" : msg.sender === "staff" ? "Kahel Studio" : "Kahel Studio"}
                </span>
                <time dateTime={msg.createdAt} className="text-xs text-text-muted">{date(msg.createdAt)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{msg.body}</p>
              {!msg.readAt && msg.sender !== "customer" && (
                <span className="mt-3 inline-block rounded-full bg-kahel-100 px-2 py-0.5 text-[11px] font-semibold text-kahel-700">New</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-8 sm:p-12">
          <h2 className="font-display text-xl font-semibold">No messages yet</h2>
          <p className="mt-2 max-w-xl text-text-secondary">When Kahel Studio sends you updates or you need to reach us about a booking, those messages will appear here.</p>
        </div>
      )}
    </main>
  );
}
