"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageSquare, Book } from "lucide-react";
import { Email } from "@/components/ui/email";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { HELP_FAQS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-canvas)]">
      <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:h-[72px] sm:px-6 lg:px-10 xl:px-12">
        <Link
          href="/os"
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ‹ All apps
        </Link>
        <span className="ml-auto text-xs tracking-[0.04em] text-[var(--color-text-muted)]">SUPPORT</span>
        <ThemeToggle size={44} />
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-7 sm:px-6 sm:pb-12 sm:pt-9 lg:px-10 xl:px-12 xl:pb-16 xl:pt-11">
        <div className="mx-auto max-w-[820px]">
          <h1 className="font-display text-[clamp(2rem,7vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.025em]">
            Help &amp; support
          </h1>
          <p className="mt-2 text-base text-[var(--color-text-secondary)]">
            Stuck on something? Start here, or reach the team directly.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[22px] hover:border-[var(--color-border-strong)]">
              <span className="mb-1.5 flex h-[42px] w-[42px] items-center justify-center rounded-control bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
                <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="font-display text-[17px] font-semibold">Report a problem</div>
              <div className="text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                File a bug or request straight to the team — context is captured for you.
              </div>
              <Link
                href="/feedback/report"
                className="mt-2.5 inline-flex min-h-11 w-fit items-center rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
              >
                Open Feedback
              </Link>
            </div>
            <div className="flex flex-col gap-1.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[22px] hover:border-[var(--color-border-strong)]">
              <span className="mb-1.5 flex h-[42px] w-[42px] items-center justify-center rounded-control bg-[var(--color-teal-100)] text-[var(--color-teal-800)]">
                <Book className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="font-display text-[17px] font-semibold">Read the docs</div>
              <div className="text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                Guides for every module, from Booking to BIR serial capture.
              </div>
              <Link
                href="/docs"
                className="mt-2.5 inline-flex min-h-11 w-fit items-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:border-[var(--color-border-strong)]"
              >
                Open docs
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Link href="/projects/deliveries" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-kahel-500)]">
              <div className="text-sm font-semibold">Client portal delivery</div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">Publish a portal and create a secure client link.</p>
            </Link>
            <Link href="/tasks/board" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-kahel-500)]">
              <div className="text-sm font-semibold">Task board</div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">Manage work through Board, List, and Calendar views.</p>
            </Link>
            <Link href="/reports" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-kahel-500)]">
              <div className="text-sm font-semibold">Reports</div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">Find report downloads and reporting guidance.</p>
            </Link>
          </div>

          <div className="mb-1 mt-10 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
            Common questions
          </div>
          {HELP_FAQS.map((f) => {
            const isOpen = openFaq === f.q;
            return (
              <div key={f.q} className="border-b border-[var(--color-border)]">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : f.q)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[15px] font-semibold">{f.q}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200", isOpen && "rotate-180")}
                    strokeWidth={2}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-200",
                    isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="text-sm leading-[21px] text-[var(--color-text-secondary)]">{f.a}</div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-7 flex items-center gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-[22px] py-[18px]">
            <MessageSquare className="h-[18px] w-[18px] shrink-0 text-[var(--color-teal-800)]" strokeWidth={1.75} />
            <div className="text-sm">
              <span className="font-semibold">Still stuck?</span>{" "}
              <span className="text-[var(--color-text-secondary)]">Email </span>
              <Email local="support" domain="kahelstudio.com" className="text-[var(--color-kahel-700)] hover:underline" />
              <span className="text-[var(--color-text-secondary)]"> — we reply within a business day.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
