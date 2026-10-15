"use client";

import { Pill } from "@/components/ui";

/**
 * Your plan's Print button: the browser's own print window (where the person can also save a PDF). In the
 * desktop app it is Electron's same call, expected to open Windows' print window; that hasn't been tried in
 * the packaged app yet. Nothing is sent anywhere.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Pill variant="maple" size="small" onClick={() => window.print()}>
      {label}
    </Pill>
  );
}
