"use client";

import { useState } from "react";
import { Globe, Loader2, CheckCircle2 } from "lucide-react";

export function PublishButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function trigger() {
    setState("loading");
    try {
      const res = await fetch("/api/publish", { method: "POST" });
      setState(res.ok ? "done" : "error");
      if (res.ok) setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
    }
  }

  const labels = { idle: "Publish to website", loading: "Publishing…", done: "Build queued", error: "Failed — retry" };

  return (
    <button
      onClick={trigger}
      disabled={state === "loading" || state === "done"}
      className="flex h-9 items-center gap-2 rounded-control px-4 text-sm font-semibold text-white disabled:opacity-60"
      style={{ background: state === "error" ? "var(--color-danger-text)" : "var(--color-kahel-500)" }}
    >
      {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
      {labels[state]}
    </button>
  );
}
