"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Download,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import type { PaymentWorkspace } from "@/lib/server/payments-data";
import { ClientEmailHistory } from "@/components/messages/client-email-history";

type Principal = { email: string; role: string };
type RecordValue = Record<string, unknown>;
type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};
type Balance = {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  phone: string;
  email: string;
  booking: string;
  invoice: string;
  service: string;
  date: string;
  total: number;
  paid: number;
  balance: number;
  items: LineItem[];
};
type Product = { id: string; name: string; detail: string; price: number };
type Transaction = {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  booking: string;
  invoice: string;
  receipt: string;
  purpose: string;
  source: string;
  processor: string;
  method: string;
  status: string;
  settlementStatus: string;
  amount: number;
  refundedAmount: number;
  balanceAmount: number;
  addOnAmount: number;
  paidAt: string;
  createdAt: string;
  description: string;
  note: string;
  providerCheckoutSessionId: string;
  providerPaymentId: string;
  providerPaymentIntentId: string;
  registerSessionLabel: string;
  creator: string;
  items: LineItem[];
  approvedRefunds: Array<{ id: string; reference: string; amount: number; reason: string }>;
};
type Settlement = {
  id: string;
  paymentId: string;
  provider: string;
  status: string;
  gross: number;
  fee: number | null;
  net: number | null;
  availableAt: string;
  settledAt: string;
};
type CashRegister = { registerId: string; registerName: string; locationName: string; sessionId: string; openedAt: string; openedBy: string; expectedCurrentAmount: number };
type ViewModel = {
  balances: Balance[];
  eligible: Balance[];
  products: Product[];
  transactions: Transaction[];
  settlements: Settlement[];
  cashRegisters: CashRegister[];
  summary: {
    received: number;
    cash: number;
    digital: number;
    outstanding: number;
    addOnMonth: number;
    pending: number;
  };
};
type Tab = "balances" | "transactions" | "settlements";
type ReceiptData = {
  number: string;
  issuedAt: string;
  method: string;
  amount: number;
  cashReceived: number | null;
  change: number | null;
  note: string;
  lines: LineItem[];
};

const tabs: Tab[] = ["balances", "transactions", "settlements"];
const inputClass =
  "min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[#FF5300] focus:shadow-[var(--shadow-focus-ring)]";

export function PaymentsWorkspace({
  initialWorkspace,
  principal,
}: {
  initialWorkspace: PaymentWorkspace;
  principal: Principal;
}) {
  const workspace = normalize(initialWorkspace);
  const [tab, setTab] = useState<Tab>("balances");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collection, setCollection] = useState<Balance | null>(null);
  const [collectionKey, setCollectionKey] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const balances = workspace.balances.filter((row) =>
    bookingMatches(deferredQuery, row),
  );
  const transactions = workspace.transactions.filter((row) =>
    matches(
      deferredQuery,
      row.clientName,
      row.phone,
      row.email,
      row.booking,
      row.invoice,
      row.receipt,
      row.purpose,
      row.source,
      row.processor,
      row.method,
      row.id,
      row.providerCheckoutSessionId,
      row.providerPaymentId,
      row.providerPaymentIntentId,
      row.description,
    ),
  );
  const settlements = workspace.settlements.filter((row) =>
    matches(deferredQuery, row.id, row.paymentId, row.provider, row.status),
  );

  function openCollection(balance: Balance, trigger?: HTMLElement) {
    if (trigger) triggerRef.current = trigger;
    setPickerOpen(false);
    setCollectionKey(crypto.randomUUID());
    setCollection(balance);
  }

  function openPicker(trigger: HTMLElement) {
    triggerRef.current = trigger;
    setPickerOpen(true);
  }

  function closeDrawer() {
    setPickerOpen(false);
    setCollection(null);
    setTransaction(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function selectTab(next: Tab, focus = false) {
    setTab(next);
    if (focus)
      requestAnimationFrame(() =>
        document.getElementById(`${next}-tab`)?.focus(),
      );
  }

  function tabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.indexOf(tab);
    let next: Tab | undefined;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft")
      next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === "Home") next = tabs[0];
    if (event.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next, true);
    }
  }

  return (
    <main className="app-page min-w-0 p-5 pb-16 sm:p-8 lg:p-10">
      <header className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.025em] sm:text-[36px]">
            Payments
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Collect balances, add-ons and product purchases in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/payments/export"
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Export
          </a>
          <button
            type="button"
            onClick={(event) => openPicker(event.currentTarget)}
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Record payment
          </button>
        </div>
      </header>

      <section
        aria-label="Payment summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          label="Received today"
          value={peso(workspace.summary.received)}
          detail={`Cash ${peso(workspace.summary.cash)} · Digital ${peso(workspace.summary.digital)}`}
        />
        <Kpi
          label="Outstanding balance"
          value={peso(workspace.summary.outstanding)}
          detail={`${workspace.balances.length} balance${workspace.balances.length === 1 ? "" : "s"} due`}
        />
        <Kpi
          label="Add-on sales this month"
          value={peso(workspace.summary.addOnMonth)}
          detail="Collected this month"
        />
        <Kpi
          label="PayMongo pending settlement"
          value={peso(workspace.summary.pending)}
          detail="Awaiting settlement"
        />
      </section>

      <div className="mt-6 flex flex-col gap-3 border-b border-[var(--color-border)] md:flex-row md:items-end md:justify-between">
        <div
          role="tablist"
          aria-label="Payment views"
          onKeyDown={tabKeyDown}
          className="flex min-w-0 overflow-x-auto"
        >
          <TabButton
            id="balances"
            active={tab === "balances"}
            onClick={() => selectTab("balances")}
          >
            Balances due <Count>{workspace.balances.length}</Count>
          </TabButton>
          <TabButton
            id="transactions"
            active={tab === "transactions"}
            onClick={() => selectTab("transactions")}
          >
            All transactions <Count>{workspace.transactions.length}</Count>
          </TabButton>
          <TabButton
            id="settlements"
            active={tab === "settlements"}
            onClick={() => selectTab("settlements")}
          >
            PayMongo settlements
          </TabButton>
        </div>
        <label className="relative mb-3 block w-full md:max-w-sm">
          <span className="sr-only">Search payments</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} pl-9`}
            placeholder="Search payments…"
          />
        </label>
      </div>

      <section
        id={`${tab}-panel`}
        role="tabpanel"
        aria-labelledby={`${tab}-tab`}
        className="mt-5"
      >
        {tab === "balances" ? (
          <BalancesTable
            rows={balances}
            searched={Boolean(deferredQuery)}
            open={openCollection}
          />
        ) : null}
        {tab === "transactions" ? (
          <TransactionsTable
            rows={transactions}
            searched={Boolean(deferredQuery)}
            open={(row, trigger) => {
              triggerRef.current = trigger;
              setTransaction(row);
            }}
          />
        ) : null}
        {tab === "settlements" ? (
          <SettlementsTable
            rows={settlements}
            searched={Boolean(deferredQuery)}
          />
        ) : null}
      </section>

      {pickerOpen ? (
        <BookingPicker
          bookings={workspace.eligible}
          close={closeDrawer}
          choose={openCollection}
        />
      ) : null}
      {collection ? (
        <CollectDrawer
          key={collectionKey}
          balance={collection}
          products={workspace.products}
          cashRegisters={workspace.cashRegisters}
          principal={principal}
          idempotencyKey={collectionKey}
          close={closeDrawer}
        />
      ) : null}
      {transaction ? (
        <TransactionDrawer transaction={transaction} cashRegisters={workspace.cashRegisters} principal={principal} close={closeDrawer} />
      ) : null}
    </main>
  );
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-3 font-display text-[26px] font-semibold tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
        {detail}
      </div>
    </div>
  );
}
function Count({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-pill bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs tabular-nums">
      {children}
    </span>
  );
}
function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: Tab;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      id={`${id}-tab`}
      role="tab"
      aria-selected={active}
      aria-controls={`${id}-panel`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${active ? "border-[#FF5300] text-[var(--color-text-primary)]" : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
    >
      {children}
    </button>
  );
}

function BalancesTable({
  rows,
  searched,
  open,
}: {
  rows: Balance[];
  searched: boolean;
  open: (row: Balance, trigger: HTMLElement) => void;
}) {
  if (!rows.length)
    return (
      <Empty>
        {searched
          ? "No balances match your search."
          : "There are no balances due."}
      </Empty>
    );
  return (
    <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {rows.map((row) => (
          <article key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{row.clientName}</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {row.booking} · {row.invoice || "No invoice"}
                </p>
              </div>
              <strong className="font-display text-lg text-[var(--color-kahel-700)]">
                {peso(row.balance)}
              </strong>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Data label="Service" value={row.service} />
              <Data label="Session" value={date(row.date)} />
              <Data label="Total" value={peso(row.total)} />
              <Data label="Paid" value={peso(row.paid)} />
            </dl>
            <button
              onClick={(event) => open(row, event.currentTarget)}
              className="mt-4 min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white"
            >
              Collect payment
            </button>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
              <Th>Client</Th>
              <Th>Booking / invoice</Th>
              <Th>Service / session</Th>
              <Th right>Total</Th>
              <Th right>Paid</Th>
              <Th right>Balance</Th>
              <Th>
                <span className="sr-only">Action</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[var(--color-border)]"
              >
                <Td>
                  <strong className="block font-semibold">
                    {row.clientName}
                  </strong>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {row.phone || row.email || "Contact unavailable"}
                  </span>
                </Td>
                <Td>
                  {row.booking}
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {row.invoice || "No invoice"}
                  </span>
                </Td>
                <Td>
                  {row.service}
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {date(row.date)}
                  </span>
                </Td>
                <Td right>{peso(row.total)}</Td>
                <Td right>{peso(row.paid)}</Td>
                <Td right>
                  <strong>{peso(row.balance)}</strong>
                </Td>
                <Td>
                  <button
                    onClick={(event) => open(row, event.currentTarget)}
                    className="min-h-11 rounded-control bg-[#FF5300] px-3 text-sm font-semibold text-white"
                  >
                    Collect
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionsTable({
  rows,
  searched,
  open,
}: {
  rows: Transaction[];
  searched: boolean;
  open: (row: Transaction, trigger: HTMLElement) => void;
}) {
  if (!rows.length)
    return (
      <Empty>
        {searched
          ? "No transactions match your search."
          : "No transactions have been recorded."}
      </Empty>
    );
  return (
    <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {rows.map((row) => (
          <article key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <strong className="block">{row.clientName}</strong>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {row.booking}
                </span>
              </div>
              <strong>{peso(row.amount - row.refundedAmount)}</strong>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Data label="Purpose" value={label(row.purpose)} />
              <Data label="Created" value={dateTime(row.createdAt)} />
              <Data
                label="Source / processor"
                value={`${label(row.source)} / ${label(row.processor)}`}
              />
              <Data label="Customer method" value={label(row.method)} />
              <Data label="Payment status" value={statusLabel(row.status)} />
              <Data label="Gross / refunded / net" value={`${peso(row.amount)} / ${peso(row.refundedAmount)} / ${peso(row.amount - row.refundedAmount)}`} />
              <Data
                label="Settlement"
                value={statusLabel(row.settlementStatus)}
              />
              <Data
                label="Cashier / creator"
                value={row.creator || "Unavailable"}
              />
              <Data
                label="Description"
                value={row.description || "Unavailable"}
              />
            </dl>
            <button
              type="button"
              onClick={(event) => open(row, event.currentTarget)}
              className="mt-4 min-h-11 w-full rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold"
            >
              View details
            </button>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1450px] border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
              <Th>Created</Th>
              <Th>Customer / booking</Th>
              <Th>Purpose</Th>
              <Th>Source / processor</Th>
              <Th>Customer method</Th>
              <Th>Description</Th>
              <Th>Payment</Th>
              <Th>Settlement</Th>
              <Th>IDs</Th>
              <Th>Cashier / creator</Th>
               <Th right>Gross</Th>
               <Th right>Refunded</Th>
               <Th right>Net</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[var(--color-border)]"
              >
                <Td>{dateTime(row.createdAt)}</Td>
                <Td>
                  <strong className="block">{row.clientName}</strong>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {row.booking} · {row.invoice || "No invoice"}
                  </span>
                </Td>
                <Td>{label(row.purpose)}</Td>
                <Td>
                  {label(row.source)}
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {label(row.processor)}
                  </span>
                </Td>
                <Td>{label(row.method)}</Td>
                <Td>
                  <span
                    className="block max-w-56 truncate"
                    title={row.description}
                  >
                    {row.description || "Unavailable"}
                  </span>
                </Td>
                <Td>
                  <Status value={row.status} />
                </Td>
                <Td>
                  <Status value={row.settlementStatus} />
                </Td>
                <Td>
                  <span
                    className="block max-w-52 truncate"
                    title={transactionIds(row)}
                  >
                    {transactionIds(row)}
                  </span>
                </Td>
                <Td>{row.creator || <Unavailable />}</Td>
                 <Td right>
                   <strong>{peso(row.amount)}</strong>
                 </Td>
                 <Td right>{peso(row.refundedAmount)}</Td>
                 <Td right><strong>{peso(row.amount - row.refundedAmount)}</strong></Td>
                <Td>
                  <button
                    type="button"
                    onClick={(event) => open(row, event.currentTarget)}
                    className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"
                  >
                    Details
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettlementsTable({
  rows,
  searched,
}: {
  rows: Settlement[];
  searched: boolean;
}) {
  if (!rows.length)
    return (
      <Empty>
        {searched
          ? "No PayMongo settlements match your search."
          : "No PayMongo settlements are available."}
      </Empty>
    );
  return (
    <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)] md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="p-4">
            <div className="flex justify-between gap-4">
              <strong>{row.id}</strong>
              <Status value={row.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Data label="Available" value={date(row.availableAt)} />
              <Data label="Settled" value={date(row.settledAt)} />
              <Data label="Gross" value={peso(row.gross)} />
              <Data
                label="Fee"
                value={row.fee === null ? "Unavailable" : peso(row.fee)}
              />
              <Data
                label="Net"
                value={row.net === null ? "Unavailable" : peso(row.net)}
              />
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
              <Th>Settlement</Th>
              <Th>Status</Th>
              <Th>Available</Th>
              <Th>Settled</Th>
              <Th right>Gross</Th>
              <Th right>Fee</Th>
              <Th right>Net</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[var(--color-border)]"
              >
                <Td>
                  <strong>{row.id}</strong>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {row.provider}
                  </span>
                </Td>
                <Td>
                  <Status value={row.status} />
                </Td>
                <Td>{date(row.availableAt)}</Td>
                <Td>{date(row.settledAt)}</Td>
                <Td right>{peso(row.gross)}</Td>
                <Td right>
                  {row.fee === null ? <Unavailable /> : peso(row.fee)}
                </Td>
                <Td right>
                  {row.net === null ? <Unavailable /> : peso(row.net)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingPicker({
  bookings,
  close,
  choose,
}: {
  bookings: Balance[];
  close: () => void;
  choose: (booking: Balance) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const rows = bookings.filter((row) => bookingMatches(deferred, row));
  useDrawer(panel, first, close, false);
  useEffect(() => {
    search.current?.focus();
  }, []);
  return (
    <DrawerFrame
      panelRef={panel}
      firstRef={first}
      title="Choose a booking"
      subtitle="Select a booking before recording payment."
      close={close}
      busy={false}
    >
      <div className="p-5">
        <label className="relative block">
          <span className="sr-only">Search eligible bookings</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} pl-9`}
            placeholder="Search name, phone, email, booking, invoice or service"
          />
        </label>
        <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
          Fully paid bookings remain available for add-on-only purchases.
        </p>
        {rows.length ? (
          <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-card border border-[var(--color-border)]">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => choose(row)}
                  className="min-h-11 w-full p-4 text-left hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF5300]"
                >
                  <span className="flex justify-between gap-4">
                    <strong>{row.clientName}</strong>
                    <span className="font-semibold">
                      {row.balance
                        ? `${peso(row.balance)} due`
                        : "Add-ons only"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                    {row.booking} · {row.invoice || "No invoice"} ·{" "}
                    {row.service}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {[row.phone, row.email].filter(Boolean).join(" · ") ||
                      "Contact unavailable"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <Empty>
              {deferred
                ? "No eligible bookings match your search."
                : "No bookings are eligible for collection."}
            </Empty>
          </div>
        )}
      </div>
    </DrawerFrame>
  );
}

function CollectDrawer({
  balance,
  products,
  cashRegisters,
  principal,
  idempotencyKey,
  close,
}: {
  balance: Balance;
  products: Product[];
  cashRegisters: CashRegister[];
  principal: Principal;
  idempotencyKey: string;
  close: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [balanceAmount, setBalanceAmount] = useState(
    balance.balance ? String(balance.balance / 100) : "0",
  );
  const [method, setMethod] = useState<"cash" | "paymongo">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [registerSessionId, setRegisterSessionId] = useState(cashRegisters.length === 1 ? cashRegisters[0].sessionId : "");
  const selectedRegister = cashRegisters.find((register) => register.sessionId === registerSessionId);
  const [note, setNote] = useState("");
  const [receiptRequested, setReceiptRequested] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const addOnAmount = products.reduce(
    (sum, product) => sum + product.price * (quantities[product.id] ?? 0),
    0,
  );
  const balanceCentavos = Math.round((Number(balanceAmount) || 0) * 100);
  const total = balanceCentavos + addOnAmount;
  const cashCentavos = Math.round((Number(cashReceived) || 0) * 100);
  const change = Math.max(0, cashCentavos - total);
  useDrawer(panel, first, close, submitting);

  function quantity(product: Product, delta: number) {
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.max(0, (current[product.id] ?? 0) + delta),
    }));
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (completed || submitting) return;
    setError("");
    if (balanceCentavos < 0 || balanceCentavos > balance.balance)
      return setError(
        "Balance payment must be between zero and the amount due.",
      );
    if (total <= 0)
      return setError("Enter a balance payment or select at least one add-on.");
    if (method === "cash" && cashCentavos < total)
      return setError("Cash received must cover the collection total.");
    if (method === "cash" && !registerSessionId)
      return setError("Select or open a cash register before posting payment.");
    if (method === "cash" && !confirmingCash) {
      setConfirmingCash(true);
      return;
    }
    setSubmitting(true);
    setStatus("Recording payment…");
    try {
      const response = await fetch("/api/payments/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: balance.bookingId,
          balanceCentavos,
          addOns: products
            .filter((product) => quantities[product.id])
            .map((product) => ({
              productId: product.id,
              quantity: quantities[product.id],
            })),
          method,
          registerSessionId: method === "cash" ? registerSessionId : undefined,
          cashReceivedCentavos: method === "cash" ? cashCentavos : undefined,
          confirmed: method === "cash",
          note: note.trim() || null,
          receipt: receiptRequested,
          createInvoice: false,
          idempotencyKey,
        }),
      });
      const result = (await response.json()) as RecordValue;
      if (!response.ok)
        throw new Error(text(result, "error") || "Unable to record payment.");
      const checkout = text(result, "checkoutUrl", "checkout_url");
      if (checkout) {
        setCompleted(true);
        window.location.assign(checkout);
        return;
      }
      const payment = object(result.payment);
      const receipt = object(result.receipt);
      const nextPaymentId =
        text(payment, "id", "paymentId") || text(result, "paymentId");
      const nextReceipt = text(
        receipt,
        "receipt_number",
        "receiptNumber",
        "number",
      );
      setPaymentId(nextPaymentId);
      setReceiptNumber(nextReceipt);
      setCompleted(true);
      setConfirmingCash(false);
      setStatus(
        nextReceipt
          ? "Payment recorded. Receipt is ready."
          : "Payment recorded successfully.",
      );
    } catch (reason) {
      setStatus("");
      setError(
        reason instanceof Error ? reason.message : "Unable to record payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DrawerFrame
      panelRef={panel}
      title="Collect payment"
      subtitle={`${balance.clientName} · ${balance.booking}`}
      close={close}
      busy={submitting}
      firstRef={first}
    >
      <form onSubmit={submit} className="flex min-h-full flex-col">
        <div className="flex-1 space-y-6 p-5">
          <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
            <h3 className="font-semibold">Customer and booking</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Data label="Customer" value={balance.clientName} />
              <Data label="Phone" value={balance.phone || "Unavailable"} />
              <Data label="Email" value={balance.email || "Unavailable"} />
              <Data label="Booking" value={balance.booking} />
              <Data label="Invoice" value={balance.invoice || "Not issued"} />
              <Data
                label="Session"
                value={`${balance.service} · ${date(balance.date)}`}
              />
              <Data label="Balance due" value={peso(balance.balance)} />
              <Data label="Prepared by" value={principal.email} />
            </dl>
          </section>
          <section>
            <h3 className="font-semibold">Invoice items</h3>
            {balance.items.length ? (
              <LineList items={balance.items} />
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                No itemized invoice is available.
              </p>
            )}
          </section>
          <section>
            <h3 className="font-semibold">Catalog add-ons</h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Optional products added to this collection.
            </p>
            {products.length ? (
              <ul className="mt-3 space-y-2">
                {products.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 rounded-control border border-[var(--color-border)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm">{product.name}</strong>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {product.detail} · {peso(product.price)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={completed}
                      onClick={() => quantity(product, -1)}
                      className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)]"
                      aria-label={`Remove one ${product.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <output
                      className="w-6 text-center text-sm font-semibold"
                      aria-label={`${product.name} quantity`}
                    >
                      {quantities[product.id] ?? 0}
                    </output>
                    <button
                      type="button"
                      disabled={completed}
                      onClick={() => quantity(product, 1)}
                      className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)]"
                      aria-label={`Add one ${product.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                No catalog products are available.
              </p>
            )}
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Balance amount
              <input
                disabled={completed}
                type="number"
                min="0"
                max={balance.balance / 100}
                step="0.01"
                value={balanceAmount}
                onChange={(event) => {
                  setBalanceAmount(event.target.value);
                  setConfirmingCash(false);
                }}
                className={`mt-1.5 ${inputClass}`}
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                disabled={completed}
                type="button"
                onClick={() => setBalanceAmount(String(balance.balance / 100))}
                className="min-h-11 flex-1 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"
              >
                Full balance
              </button>
              <button
                disabled={completed}
                type="button"
                onClick={() => setBalanceAmount("0")}
                className="min-h-11 flex-1 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"
              >
                Add-on only
              </button>
            </div>
          </section>
          <fieldset disabled={completed}>
            <legend className="text-sm font-semibold">Payment method</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Method
                name="payment-method"
                value="cash"
                checked={method === "cash"}
                onChange={() => {
                  setMethod("cash");
                  setConfirmingCash(false);
                }}
              >
                Cash
              </Method>
              <Method
                name="payment-method"
                value="paymongo"
                checked={method === "paymongo"}
                onChange={() => {
                  setMethod("paymongo");
                  setConfirmingCash(false);
                }}
              >
                Digital / PayMongo
              </Method>
            </div>
          </fieldset>
          {method === "cash" ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Cash register
                <select required disabled={completed || !cashRegisters.length} value={registerSessionId} onChange={(event) => { setRegisterSessionId(event.target.value); setConfirmingCash(false); }} className={`mt-1.5 ${inputClass}`}>
                  <option value="">Select an open register</option>
                  {cashRegisters.map((register) => <option key={register.sessionId} value={register.sessionId}>{register.locationName} · {register.registerName} · {peso(register.expectedCurrentAmount)}</option>)}
                </select>
              </label>
              {selectedRegister ? <p className="text-xs text-[var(--color-text-secondary)]">Opened {dateTime(selectedRegister.openedAt)} by {selectedRegister.openedBy}. Expected cash: {peso(selectedRegister.expectedCurrentAmount)}.</p> : null}
              {!cashRegisters.length ? <p className="rounded-control bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-text)]">No cash register is open. <a href="/pos/register" className="font-semibold underline">Open a register</a> before collecting cash, or use PayMongo.</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Cash received
                <input
                  disabled={completed}
                  type="number"
                  min={total / 100}
                  step="0.01"
                  value={cashReceived}
                  onChange={(event) => {
                    setCashReceived(event.target.value);
                    setConfirmingCash(false);
                  }}
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <Data label="Change" value={peso(change)} />
              </div>
            </div>
          ) : null}
          <label className="block text-sm font-semibold">
            Notes
            <textarea
              disabled={completed}
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1.5 py-3 ${inputClass}`}
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              disabled={completed}
              type="checkbox"
              checked={receiptRequested}
              onChange={(event) => setReceiptRequested(event.target.checked)}
              className="h-5 w-5 accent-[#FF5300]"
            />{" "}
            Issue receipt
          </label>
          <section className="rounded-card border border-[var(--color-border)] p-4">
            <h3 className="font-semibold">Collection total</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Total label="Balance payment" value={peso(balanceCentavos)} />
              <Total label="Add-ons" value={peso(addOnAmount)} />
              <Total label="Total" value={peso(total)} strong />
            </dl>
          </section>
          {confirmingCash && !completed ? (
            <div
              className="rounded-card border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]"
              role="alert"
            >
              <strong className="block">Confirm cash collection</strong>
              <span className="mt-1 block">
                 Record {peso(total)} cash received from {balance.clientName}
                 at {selectedRegister ? `${selectedRegister.locationName} · ${selectedRegister.registerName}` : "the selected register"}, with {peso(change)} change?
              </span>
            </div>
          ) : null}
          {error ? (
            <p
              className="rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div
            className="text-sm text-[var(--color-success-text)]"
            aria-live="polite"
          >
            {status}
            {paymentId ? (
              <span className="mt-1 block text-[var(--color-text-secondary)]">
                Payment ID: {paymentId}
              </span>
            ) : null}
            {receiptNumber ? (
              <span className="mt-1 block font-semibold">
                Receipt ready: {receiptNumber}
              </span>
            ) : null}
          </div>
        </div>
        <footer className="sticky bottom-0 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {completed ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || total <= 0 || (method === "cash" && (!cashRegisters.length || !registerSessionId))}
                className="min-h-11 flex-1 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting
                  ? "Recording…"
                  : confirmingCash
                    ? "Confirm cash payment"
                    : method === "cash"
                      ? "Review cash payment"
                      : "Continue to PayMongo"}
              </button>
            </>
          )}
        </footer>
      </form>
    </DrawerFrame>
  );
}

function TransactionDrawer({
  transaction,
  cashRegisters,
  principal,
  close,
}: {
  transaction: Transaction;
  cashRegisters: CashRegister[];
  principal: Principal;
  close: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const receiptRef = useRef<HTMLElement>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(Boolean(transaction.receipt));
  const [loadError, setLoadError] = useState("");
  const [receiptStatus, setReceiptStatus] = useState<{
    type: "pending" | "success" | "error";
    message: string;
  } | null>(null);
  const [resending, setResending] = useState(false);
  const [reason, setReason] = useState("");
  const [reconcileError, setReconcileError] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const canReconcile =
    transaction.processor.toLowerCase() === "paymongo" &&
    ["failed", "expired"].includes(transaction.status.toLowerCase());
  const [refundApprovalId, setRefundApprovalId] = useState(transaction.approvedRefunds.length === 1 ? transaction.approvedRefunds[0].id : "");
  const selectedRefund = transaction.approvedRefunds.find((approval) => approval.id === refundApprovalId);
  const [refundReason, setRefundReason] = useState(selectedRefund?.reason ?? "");
  const [refundRegisterSessionId, setRefundRegisterSessionId] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refunded, setRefunded] = useState(false);
  const cashRefundEligible = transaction.method === "cash" && transaction.processor === "none" && transaction.source !== "legacy_import" && transaction.addOnAmount === 0 && ["paid", "partially_refunded"].includes(transaction.status);
  const openRegisters = cashRegisters.filter((register) => register.sessionId);
  const busy = resending || reconciling || refunding;
  useDrawer(panel, first, close, busy);
  useEffect(() => {
    if (!transaction.receipt) return;
    const controller = new AbortController();
    fetch(`/api/payments/receipt/${encodeURIComponent(transaction.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as RecordValue;
        if (!response.ok)
          throw new Error(text(data, "error") || "Unable to load the receipt.");
        return receiptData(data);
      })
      .then(setReceipt)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "Unable to load the receipt.",
          );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [transaction.id, transaction.receipt]);
  function printReceipt() {
    window.print();
  }
  async function resendReceipt() {
    if (!transaction.receipt || resending) return;
    setResending(true);
    setReceiptStatus({ type: "pending", message: "Resending receipt…" });
    try {
      const response = await fetch(
        `/api/payments/receipt/${encodeURIComponent(transaction.id)}`,
        { method: "POST" },
      );
      const result = (await response.json()) as RecordValue;
      if (!response.ok)
        throw new Error(
          text(result, "error") || "Unable to resend the receipt.",
        );
      setReceiptStatus({
        type: "success",
        message: "Receipt sent successfully.",
      });
    } catch (reason) {
      setReceiptStatus({
        type: "error",
        message:
          reason instanceof Error
            ? reason.message
            : "Unable to resend the receipt.",
      });
    } finally {
      setResending(false);
    }
  }
  async function reconcile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReconcile || reconciling || reconciled) return;
    const trimmedReason = reason.trim();
    setReconcileError("");
    if (trimmedReason.length < 5 || trimmedReason.length > 1000) {
      setReconcileError(
        "Enter a reconciliation reason of 5 to 1,000 characters.",
      );
      return;
    }
    if (
      !window.confirm(
        "Reconcile this failed or expired PayMongo transaction? This will cancel the payment reservation.",
      )
    )
      return;
    setReconciling(true);
    try {
      const response = await fetch("/api/payments/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentId: transaction.id,
          reason: trimmedReason,
        }),
      });
      const result = (await response.json()) as RecordValue;
      if (!response.ok)
        throw new Error(
          text(result, "error") || "Unable to reconcile the transaction.",
        );
      setReconciled(true);
    } catch (reason) {
      setReconcileError(
        reason instanceof Error
          ? reason.message
          : "Unable to reconcile the transaction.",
      );
    } finally {
      setReconciling(false);
    }
  }
  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRefund || refunding || refunded) return;
    const reason = refundReason.trim();
    setRefundError("");
    if (reason.length < 3 || reason.length > 1000) return setRefundError("Enter a refund reason of 3 to 1,000 characters.");
    if (!window.confirm(`Confirm ${peso(selectedRefund.amount)} cash refund for ${transaction.clientName}?`)) return;
    setRefunding(true);
    try {
      const response = await fetch("/api/payments/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId: transaction.id, approvalRequestId: selectedRefund.id, amountCentavos: selectedRefund.amount, reason, registerSessionId: refundRegisterSessionId || null, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json() as RecordValue;
      if (!response.ok) throw new Error(text(result, "error") || "Unable to record cash refund.");
      setRefunded(true);
    } catch (reason) {
      setRefundError(reason instanceof Error ? reason.message : "Unable to record cash refund.");
    } finally {
      setRefunding(false);
    }
  }
  return (
    <DrawerFrame
      panelRef={panel}
      firstRef={first}
      title="Transaction details"
      subtitle={transaction.receipt || transaction.id}
      close={close}
      busy={busy}
    >
      <div className="space-y-6 p-5">
        <div className="flex items-center justify-between rounded-card bg-[var(--color-canvas)] p-4">
          <div>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Gross amount
            </span>
            <div className="mt-1 font-display text-2xl font-semibold">
              {peso(transaction.amount - transaction.refundedAmount)}
            </div>
          </div>
          <Status value={transaction.status} />
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Data label="Customer" value={transaction.clientName} />
          <Data label="Gross amount" value={peso(transaction.amount)} />
          <Data label="Refunded amount" value={peso(transaction.refundedAmount)} />
          <Data label="Net amount" value={peso(transaction.amount - transaction.refundedAmount)} />
          <Data label="Booking" value={transaction.booking} />
          <Data label="Purpose" value={label(transaction.purpose)} />
          <Data
            label="Source / processor"
            value={`${label(transaction.source)} / ${label(transaction.processor)}`}
          />
          <Data label="Customer method" value={label(transaction.method)} />
          {transaction.registerSessionLabel ? <Data label="Cash register session" value={transaction.registerSessionLabel} /> : null}
          <Data
            label="Settlement status"
            value={statusLabel(transaction.settlementStatus)}
          />
          <Data label="Created" value={dateTime(transaction.createdAt)} />
          <Data label="Paid" value={dateTime(transaction.paidAt)} />
          <Data label="Payment ID" value={transaction.id} />
          <Data
            label="Provider payment ID"
            value={transaction.providerPaymentId || "Unavailable"}
          />
          <Data
            label="Payment intent ID"
            value={transaction.providerPaymentIntentId || "Unavailable"}
          />
          <Data
            label="Checkout session ID"
            value={transaction.providerCheckoutSessionId || "Unavailable"}
          />
          <Data
            label="Cashier / creator"
            value={transaction.creator || "Unavailable"}
          />
          <Data
            label="Description"
            value={transaction.description || "Unavailable"}
          />
        </dl>
        <ClientEmailHistory context={{ paymentId: transaction.id, bookingReference: transaction.booking }} />
        {transaction.note ? (
          <section>
            <h3 className="font-semibold">Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
              {transaction.note}
            </p>
          </section>
        ) : null}
        {transaction.receipt ? (
          <section
            ref={receiptRef}
            tabIndex={-1}
            className="scroll-mt-24 rounded-card border border-[var(--color-border)] p-4 outline-none print:border-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 font-semibold">
                <ReceiptText className="h-4 w-4" /> Persisted receipt
              </h3>
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={resendReceipt}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold disabled:opacity-50"
                >
                  <ReceiptText className="h-4 w-4" aria-hidden="true" />{" "}
                  {resending ? "Resending…" : "Resend receipt"}
                </button>
                {receipt ? (
                  <button
                    type="button"
                    onClick={printReceipt}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" /> Print
                  </button>
                ) : null}
              </div>
            </div>
            {loading ? (
              <div className="mt-4 space-y-2 animate-pulse" role="status">
                <span className="sr-only">Loading receipt</span>
                <div className="h-5 rounded bg-[var(--color-surface-muted)]" />
                <div className="h-20 rounded bg-[var(--color-surface-muted)]" />
              </div>
            ) : null}
            {loadError ? (
              <p
                className="mt-4 rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]"
                role="alert"
              >
                {loadError}
              </p>
            ) : null}
            <div
              className={`mt-3 text-sm ${receiptStatus?.type === "error" ? "text-[var(--color-danger-text)]" : receiptStatus?.type === "success" ? "text-[var(--color-success-text)]" : "text-[var(--color-text-secondary)]"}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {receiptStatus?.message}
            </div>
            {receipt ? (
              <div className="mt-4 space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Data
                    label="Receipt"
                    value={receipt.number || transaction.receipt}
                  />
                  <Data label="Issued" value={dateTime(receipt.issuedAt)} />
                  <Data label="Method" value={label(receipt.method)} />
                  <Data label="Amount" value={peso(receipt.amount)} />
                  {receipt.cashReceived !== null ? (
                    <Data
                      label="Cash received"
                      value={peso(receipt.cashReceived)}
                    />
                  ) : null}
                  {receipt.change !== null ? (
                    <Data label="Change" value={peso(receipt.change)} />
                  ) : null}
                </dl>
                <LineList items={receipt.lines} />
                {receipt.note ? (
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                    {receipt.note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No receipt was issued for this transaction.
          </p>
        )}
        {canReconcile ? (
          <section className="rounded-card border border-[var(--color-border)] p-4">
            <h3 className="font-semibold">Reconcile transaction</h3>
            {reconciled ? (
              <div className="mt-3" aria-live="polite">
                <p className="text-sm text-[var(--color-success-text)]">
                  Transaction reconciled successfully.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={reconcile} className="mt-3">
                <label className="block text-sm font-semibold">
                  Reason
                  <span className="mt-1 block text-xs font-normal text-[var(--color-text-secondary)]">
                    Required, 5 to 1,000 characters.
                  </span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={4}
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setReconcileError("");
                    }}
                    disabled={busy}
                    className={`mt-2 py-3 ${inputClass}`}
                  />
                </label>
                {reconcileError ? (
                  <p
                    className="mt-3 rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]"
                    role="alert"
                    aria-live="assertive"
                  >
                    {reconcileError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy || reason.trim().length < 5}
                  className="mt-3 min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {reconciling ? "Reconciling…" : "Reconcile transaction"}
                </button>
              </form>
            )}
          </section>
        ) : null}
        {principal.role === "super_admin" ? (
          <section className="rounded-card border border-[var(--color-border)] p-4">
            <h3 className="font-semibold">Cash refund</h3>
            {!cashRefundEligible ? <p className="mt-2 text-sm text-[var(--color-warning-text)]">{transaction.processor === "paymongo" ? "PayMongo payments cannot be refunded here." : transaction.addOnAmount > 0 ? "Payments containing add-ons cannot be refunded." : "This transaction is not an eligible nonlegacy cash balance payment."}</p> : !transaction.approvedRefunds.length ? <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Request and approve a payment-bound client refund before paying it here.</p> : refunded ? <div className="mt-3"><p className="text-sm text-[var(--color-success-text)]">Cash refund recorded successfully.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">Done</button></div> : (
              <form onSubmit={submitRefund} className="mt-3 space-y-4">
                <label className="block text-sm font-semibold">Approved refund<select required value={refundApprovalId} onChange={(event) => { const id = event.target.value; setRefundApprovalId(id); setRefundReason(transaction.approvedRefunds.find((approval) => approval.id === id)?.reason ?? ""); }} className={`mt-1.5 ${inputClass}`}><option value="">Select approval</option>{transaction.approvedRefunds.map((approval) => <option key={approval.id} value={approval.id}>{approval.reference} · {peso(approval.amount)}</option>)}</select></label>
                <Data label="Fixed approved amount" value={selectedRefund ? peso(selectedRefund.amount) : "Select an approval"} />
                <label className="block text-sm font-semibold">Reason<textarea required minLength={3} maxLength={1000} rows={3} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} className={`mt-1.5 py-3 ${inputClass}`} /></label>
                <label className="block text-sm font-semibold">Cash source<select value={refundRegisterSessionId} onChange={(event) => setRefundRegisterSessionId(event.target.value)} className={`mt-1.5 ${inputClass}`}><option value="">External cash, not an open register</option>{openRegisters.map((register) => <option key={register.sessionId} value={register.sessionId}>{register.locationName} · {register.registerName}</option>)}</select></label>
                <p className="text-xs text-[var(--color-text-secondary)]">Selecting a register records cash out and enforces its minimum cash balance.</p>
                {refundError ? <p role="alert" className="rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">{refundError}</p> : null}
                <button type="submit" disabled={busy || !selectedRefund || refundReason.trim().length < 3} className="min-h-11 w-full rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">{refunding ? "Recording refund…" : "Review and record cash refund"}</button>
              </form>
            )}
          </section>
        ) : null}
      </div>
    </DrawerFrame>
  );
}

function DrawerFrame({
  panelRef,
  firstRef,
  title,
  subtitle,
  close,
  busy,
  children,
}: {
  panelRef: React.RefObject<HTMLElement | null>;
  firstRef: React.RefObject<HTMLButtonElement | null>;
  title: string;
  subtitle: string;
  close: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/45"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) close();
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-dialog)] motion-safe:animate-in motion-safe:slide-in-from-right"
      >
        <header className="sticky top-0 z-20 flex items-start gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl font-semibold">
              {title}
            </h2>
            <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          </div>
          <button
            ref={firstRef}
            type="button"
            onClick={close}
            disabled={busy}
            className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)]"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
function useDrawer(
  panel: React.RefObject<HTMLElement | null>,
  first: React.RefObject<HTMLButtonElement | null>,
  close: () => void,
  busy: boolean,
) {
  useEffect(() => {
    first.current?.focus();
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const firstItem = focusable[0],
        lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [busy, close, first, panel]);
}

function Method({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-sm font-semibold ${checked ? "border-[#FF5300] bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]" : "border-[var(--color-border)]"}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="absolute left-3 h-4 w-4 accent-[#FF5300]"
      />
      <span>{children}</span>
    </label>
  );
}
function Status({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const success = ["paid", "settled"].includes(normalized);
  const danger = ["failed", "cancelled", "expired"].includes(normalized);
  return (
    <span
      className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold ${success ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : danger ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"}`}
    >
      {statusLabel(value)}
    </span>
  );
}
function Unavailable() {
  return (
    <span className="text-xs text-[var(--color-text-muted)]">Unavailable</span>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
      <div>
        <WalletCards
          className="mx-auto mb-3 h-7 w-7 text-[#FF5300]"
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  );
}
function Data({ label: dataLabel, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--color-text-muted)]">
        {dataLabel}
      </dt>
      <dd className="mt-1 break-words font-medium text-[var(--color-text-primary)]">
        {value}
      </dd>
    </div>
  );
}
function Total({
  label: totalLabel,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "border-t border-[var(--color-border)] pt-3 text-base font-semibold" : ""}`}
    >
      <dt>{totalLabel}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function LineList({ items }: { items: LineItem[] }) {
  return items.length ? (
    <ul className="mt-2 divide-y divide-[var(--color-border)] rounded-card border border-[var(--color-border)]">
      {items.map((item, index) => (
        <li
          key={`${item.description}-${index}`}
          className="flex justify-between gap-4 p-3 text-sm"
        >
          <span>
            {item.quantity} × {item.description}
          </span>
          <span>{peso(item.total)}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
      No persisted line items.
    </p>
  );
}
function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={`px-4 py-3 ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}
function Td({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <td
      className={`px-4 py-3 text-sm ${right ? "text-right tabular-nums" : ""}`}
    >
      {children}
    </td>
  );
}

function normalize(input: PaymentWorkspace): ViewModel {
  const root = object(input);
  const summary = object(root.summary ?? root.kpis);
  const mapBooking = (value: unknown, index: number): Balance => {
    const row = object(value);
    const invoice = object(row.invoice);
    const total = amount(
      row,
      "totalCentavos",
      "totalAmountCentavos",
      "totalAmount",
      "total",
    );
    const paid = amount(
      row,
      "paidCentavos",
      "paidAmountCentavos",
      "paidAmount",
      "paid",
    );
    return {
      id: text(row, "id", "bookingId", "bookingReference") || String(index),
      bookingId: text(row, "bookingId", "id"),
      clientId: text(row, "clientId"),
      clientName:
        text(row, "clientName", "customerName", "name") || "Unknown client",
      phone: text(row, "customerPhone", "clientPhone", "phone"),
      email: text(row, "customerEmail", "clientEmail", "email"),
      booking: text(row, "bookingReference", "booking", "reference"),
      invoice: text(row, "invoiceReference") || text(invoice, "reference"),
      service: text(row, "service", "serviceType", "description"),
      date: text(row, "serviceDate", "bookingDate", "date"),
      total,
      paid,
      balance:
        amount(
          row,
          "availableToCollectCentavos",
          "balanceCentavos",
          "balanceAmountCentavos",
          "outstandingCentavos",
          "balance",
        ) || Math.max(0, total - paid),
      items: lines(invoice.items ?? row.items ?? row.invoiceItems),
    };
  };
  const balances = array(
    root.outstandingBookings ??
      root.balances ??
      root.balancesDue ??
      root.outstanding,
  ).map(mapBooking);
  const eligibleSource = root.collectibleBookings ?? root.eligibleBookings;
  const eligible = Array.isArray(eligibleSource)
    ? eligibleSource.map(mapBooking)
    : balances;
  const products = array(root.products ?? root.catalogProducts ?? root.catalog)
    .map((value) => {
      const row = object(value);
      const category = text(row, "category");
      const sku = text(row, "sku");
      return {
        id: text(row, "id", "productId"),
        name: text(row, "name", "title"),
        detail:
          [category, sku].filter(Boolean).join(" · ") ||
          text(row, "detail", "description"),
        price: amount(row, "unitPriceCentavos", "priceCentavos", "price"),
      };
    })
    .filter((row) => row.id);
  const transactions = array(root.transactions ?? root.payments).map(
    (value, index) => {
      const row = object(value);
      const itemLines = lines(row.lines ?? row.items ?? row.lineItems);
      return {
        id: text(row, "id", "paymentId", "reference") || String(index),
        clientName:
          text(row, "clientName", "customerName", "name") || "Unknown client",
        phone: text(row, "customerPhone", "clientPhone", "phone"),
        email: text(row, "customerEmail", "clientEmail", "email"),
        booking: text(row, "bookingReference", "booking", "reference"),
        invoice: text(row, "invoiceReference", "invoice"),
        receipt: text(row, "receiptNumber", "receiptReference", "receipt"),
        purpose: text(row, "purpose", "paymentPurpose") || "payment",
        source: text(row, "source") || "unknown",
        processor: text(row, "processor", "provider") || "unknown",
        method:
          text(row, "paymentMethodDetail") ||
          text(row, "paymentMethod", "method") ||
          "unknown",
        status: text(row, "status") || "pending",
        settlementStatus: text(row, "settlementStatus") || "unavailable",
        amount: amount(row, "amountCentavos", "amount"),
        refundedAmount: amount(row, "refundedAmountCentavos", "refundedAmount"),
        balanceAmount: amount(
          row,
          "balanceComponentCentavos",
          "balanceAmountCentavos",
        ),
        addOnAmount: amount(row, "addOnAmountCentavos"),
        paidAt: text(row, "paidAt"),
        createdAt: text(row, "createdAt", "date"),
        description:
          text(row, "description") ||
          itemLines
            .map((item) => item.description)
            .filter(Boolean)
            .join(", "),
        note: text(row, "note", "notes"),
        providerCheckoutSessionId: text(
          row,
          "providerCheckoutSessionId",
          "checkoutSessionId",
        ),
        providerPaymentId: text(row, "providerPaymentId"),
        providerPaymentIntentId: text(row, "providerPaymentIntentId"),
        registerSessionLabel: text(row, "registerSessionLabel", "register_session_label"),
        creator: text(row, "cashier", "creator", "createdBy", "createdByName"),
        items: itemLines,
        approvedRefunds: array(row.approvedRefunds).map((value) => { const approval = object(value); return { id: text(approval, "id"), reference: text(approval, "reference"), amount: amount(approval, "amountCentavos", "amount"), reason: text(approval, "reason") }; }).filter((approval) => approval.id && approval.amount > 0),
      };
    },
  );
  const settlements = array(root.settlements).map((value, index) => {
    const row = object(value);
    return {
      id: text(row, "providerSettlementId", "id", "reference") || String(index),
      paymentId: text(row, "paymentId"),
      provider: text(row, "provider") || "PayMongo",
      status: text(row, "status") || "pending",
      gross: amount(row, "grossCentavos", "grossAmountCentavos", "gross"),
      fee: nullableAmount(row, "feeCentavos", "feeAmountCentavos", "fee"),
      net: nullableAmount(row, "netCentavos", "netAmountCentavos", "net"),
      availableAt: text(row, "availableAt"),
      settledAt: text(row, "settledAt"),
    };
  });
  const cashRegisters = array(root.cashRegisters ?? root.cashSessions ?? root.openCashSessions).map((value) => {
    const row = object(value);
    return { registerId: text(row, "registerId", "register_id"), registerName: text(row, "registerName", "register_name"), locationName: text(row, "locationName", "location_name"), sessionId: text(row, "sessionId", "session_id", "id"), openedAt: text(row, "openedAt", "opened_at"), openedBy: text(row, "openedBy", "opened_by", "openedByName") || "Unknown staff", expectedCurrentAmount: amount(row, "expectedCurrentAmountCentavos", "expected_current_amount_centavos", "expectedAmountCentavos") };
  }).filter((row) => row.registerId && row.sessionId);
  const receivedToday = object(root.receivedToday);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(new Date());
  const month = today.slice(0, 7);
  const paidToday = transactions.filter(
    (row) =>
      row.status.toLowerCase() === "paid" && manilaDay(row.paidAt) === today,
  );
  const paymongoPending = settlements
    .filter((row) =>
      ["pending", "available"].includes(row.status.toLowerCase()),
    )
    .reduce((sum, row) => sum + (row.net ?? row.gross), 0);
  return {
    balances,
    eligible,
    products,
    transactions,
    settlements,
    cashRegisters,
    summary: {
      received:
        amount(receivedToday, "totalCentavos") ||
        amount(summary, "receivedTodayCentavos", "receivedToday", "received") ||
        paidToday.reduce((sum, row) => sum + row.amount, 0),
      cash:
        amount(receivedToday, "cashCentavos") ||
        amount(summary, "cashTodayCentavos", "cashToday", "cash"),
      digital:
        amount(receivedToday, "paymongoCentavos") +
          amount(receivedToday, "otherCentavos") ||
        amount(summary, "digitalTodayCentavos", "digitalToday", "digital"),
      outstanding:
        amount(summary, "outstandingCentavos", "outstanding") ||
        balances.reduce((sum, row) => sum + row.balance, 0),
      addOnMonth:
        amount(summary, "addOnMonthCentavos", "addOnMonth") ||
        transactions
          .filter(
            (row) =>
              manilaDay(row.paidAt).startsWith(month) &&
              ["paid", "partially_refunded"].includes(row.status.toLowerCase()),
          )
          .reduce((sum, row) => sum + row.addOnAmount, 0),
      pending:
        amount(
          summary,
          "paymongoPendingCentavos",
          "paymongoPending",
          "pending",
        ) || paymongoPending,
    },
  };
}

function receiptData(value: RecordValue): ReceiptData {
  const receipt = object(value.receipt);
  return {
    number: text(receipt, "receipt_number", "receiptNumber", "number"),
    issuedAt: text(receipt, "issued_at", "issuedAt"),
    method: text(receipt, "payment_method", "paymentMethod"),
    amount: amount(receipt, "amount_centavos", "amountCentavos", "amount"),
    cashReceived: nullableAmount(
      receipt,
      "cash_received_centavos",
      "cashReceivedCentavos",
      "cashReceived",
    ),
    change: nullableAmount(
      receipt,
      "change_centavos",
      "changeCentavos",
      "change",
    ),
    note: text(receipt, "note"),
    lines: lines(value.lines),
  };
}
function object(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(row: RecordValue, ...keys: string[]): string {
  for (const key of keys)
    if (typeof row[key] === "string") return row[key] as string;
  return "";
}
function amount(row: RecordValue, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value))
      return key.toLowerCase().includes("centavo")
        ? value
        : Math.round(value * 100);
  }
  return 0;
}
function nullableAmount(row: RecordValue, ...keys: string[]): number | null {
  for (const key of keys) {
    if (row[key] === null) return null;
    if (typeof row[key] === "number")
      return key.toLowerCase().includes("centavo")
        ? (row[key] as number)
        : Math.round((row[key] as number) * 100);
  }
  return null;
}
function lines(value: unknown): LineItem[] {
  return array(value).map((item) => {
    const row = object(item);
    const quantity = typeof row.quantity === "number" ? row.quantity : 1;
    const unitPrice = amount(
      row,
      "unitPriceCentavos",
      "unit_price_centavos",
      "unitPrice",
      "price",
    );
    return {
      description: text(row, "description", "name", "title"),
      quantity,
      unitPrice,
      total:
        amount(row, "totalCentavos", "total_centavos", "total") ||
        quantity * unitPrice,
    };
  });
}
function bookingMatches(query: string, row: Balance) {
  return matches(
    query,
    row.clientName,
    row.phone,
    row.email,
    row.booking,
    row.invoice,
    row.service,
    row.bookingId,
  );
}
function matches(query: string, ...values: string[]) {
  return !query || values.some((value) => value.toLowerCase().includes(query));
}
function transactionIds(row: Transaction) {
  return [
    row.id,
    row.providerPaymentId,
    row.providerPaymentIntentId,
    row.providerCheckoutSessionId,
  ]
    .filter(Boolean)
    .join(" · ");
}
function label(value: string) {
  return value ? statusLabel(value) : "Unavailable";
}
function peso(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavos / 100);
}
function date(value: string) {
  if (!value) return "Unavailable";
  const parsed = new Date(
    value.length === 10 ? `${value}T12:00:00+08:00` : value,
  );
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(parsed);
}
function dateTime(value: string) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(parsed);
}
function manilaDay(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
        parsed,
      );
}
function statusLabel(value: string) {
  return value
    ? value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Unavailable";
}
