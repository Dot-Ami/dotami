"use client";

import { useEffect, useState } from "react";

import type { DatabaseLockState } from "@/lib/db/lock";
import { loadSetting, saveSetting } from "@/lib/settings/client";

/**
 * [8i] The "Encrypt the data file" switch (docs/architecture/database-encryption.md § 7; the maintainer's
 * decision 4 of 2026-10-10: a person may say "Never", and Settings can turn encryption on later).
 *
 * What it can do depends on the file today (`lock`, read on the server from the desktop app's own
 * environment): while the file is plain in the desktop app, it switches between "ask me at the next
 * start and encrypt" and "never" (with the warning first); once the file is encrypted it says so and
 * offers nothing, since DotAmi doesn't decrypt a file; a copy run from source says only the desktop app
 * encrypts. Like the reminders, it reads the saved value itself before it lets anything be changed, and
 * shows what the app answers, never what was clicked.
 */
export function DatabaseEncryptionControl({ lock }: { lock: DatabaseLockState }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [read, setRead] = useState<"reading" | "ready" | "failed">("reading");
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    let live = true;
    void loadSetting("database-encryption").then((value) => {
      if (!live) return;
      if (!value) return setRead("failed");
      setOn(value.on);
      setRead("ready");
    });
    return () => {
      live = false;
    };
  }, []);

  if (lock === "on") {
    return <p className="text-[12px] text-paper-dim">On: your data file is encrypted, and stays encrypted.</p>;
  }
  if (lock === "source") {
    return <p className="text-[12px] text-paper-dim">Only the desktop app encrypts the data file; this copy, run from source, can&apos;t.</p>;
  }

  async function save(next: boolean) {
    setState("saving");
    const saved = await saveSetting("database-encryption", { on: next });
    if (saved) {
      setOn(saved.on);
      setState("saved");
    } else {
      setState("error");
    }
    setConfirming(false);
  }

  return (
    <div className="space-y-2 text-[12.5px]">
      <label className="flex items-center gap-2 text-paper">
        <input
          type="checkbox"
          checked={on === true}
          disabled={read !== "ready" || state === "saving"}
          onChange={(event) => {
            // Turning it off asks first, with what it leaves unprotected; turning it on saves at once.
            if (event.target.checked) void save(true);
            else setConfirming(true);
          }}
        />
        Encrypt the data file
      </label>
      {confirming ? (
        <div role="alertdialog" aria-label="Never encrypt the data file?" className="rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-amber">
          <p>
            Your data file stays unencrypted: anyone who can read your data folder, a copy of it, or this computer&apos;s
            disk outside Windows can read it. DotAmi won&apos;t ask again until you turn this back on.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-full border border-rule px-3 py-0.5 text-paper" onClick={() => setConfirming(false)}>
              Go back
            </button>
            <button type="button" className="rounded-full border border-amber/60 px-3 py-0.5 text-amber" onClick={() => void save(false)}>
              Keep it unencrypted
            </button>
          </div>
        </div>
      ) : null}
      <p role="status" className="text-[12px] text-paper-dim">
        {read === "failed"
          ? "DotAmi couldn't read this choice from your data file."
          : state === "error"
            ? "Couldn't save; nothing changed."
            : on === true
              ? lock === "no-key-store"
                ? "On: DotAmi encrypts the file once Windows' key store is available, asking first."
                : "On: DotAmi asks to encrypt your data file the next time it starts."
              : on === false
                ? "Never: the data file stays unencrypted, and DotAmi doesn't ask."
                : ""}
      </p>
    </div>
  );
}
