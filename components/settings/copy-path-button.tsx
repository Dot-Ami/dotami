"use client";

import { useState } from "react";

/** Copies the data file's path, so backing it up is one paste into a file manager. */
export function CopyPathButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(path);
      setState("copied");
    } catch {
      // The clipboard needs a secure page (localhost counts); say so instead of failing silently.
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="shrink-0 rounded border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stone transition hover:border-maple-soft hover:text-paper"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed — select it instead" : "Copy path"}
    </button>
  );
}
