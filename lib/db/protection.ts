/**
 * [8i] What DotAmi says about how the data file is protected (docs/architecture/database-encryption.md
 * § 7). One place for the sentences, so Settings and What DotAmi knows about you say the same thing. No
 * node or browser import: pages and the server both read it.
 *
 * Only the Windows desktop app is built today, so the sentences about the key name Windows.
 */
import type { DatabaseLockState } from "./lock";

export interface DatabaseProtectionText {
  /** One short line. */
  headline: string;
  /** What it means: what it protects, what it doesn't, and what losing the key costs. */
  detail: string;
  /** "ok": encrypted. "plain": kept unencrypted, said plainly. */
  tone: "ok" | "plain";
}

/** Losing the key loses the data file, except what a backup holds: said wherever the person sees the encryption. */
export const DATABASE_KEY_LOSS_SENTENCE =
  "If that key is ever lost (your Windows profile is reset, an administrator resets your password, or this data folder is moved to another account or computer), everything in the data file is lost except what a backup holds (File → Back up…).";

/** Going back to an older version can't open the encrypted file: said in Settings, the window before encrypting and the privacy log. */
export const OLDER_VERSION_SENTENCE = "An older DotAmi can't open the encrypted file; going back to one needs a backup, restored in that version.";

/** What can't be promised about the plain file encryption replaced (database-encryption.md § 1, § 6). */
export const DISK_SENTENCE =
  "The plain file it replaced was overwritten and deleted, which makes it unreadable through Windows but, on a solid-state disk, doesn't promise its old bytes are gone from the disk itself; copies Windows or a synced folder made before aren't changed. Disk encryption covers those.";

export function databaseProtectionText(state: DatabaseLockState, plainLeft = 0): DatabaseProtectionText {
  const leftover =
    plainLeft > 0
      ? ` ${plainLeft === 1 ? "One plain copy of your data is" : `${plainLeft} plain copies of your data are`} still on this computer, because another program had ${plainLeft === 1 ? "it" : "them"} open; DotAmi encrypts or wipes ${plainLeft === 1 ? "it" : "them"} at its next start.`
      : "";
  switch (state) {
    case "on":
      return {
        headline: "Your data file is encrypted on this computer.",
        // Precise on purpose, as for the receipts: Windows' folder permissions already keep other
        // standard accounts out of the data folder (database-encryption.md § 1).
        detail: `It and its safety copies are locked with a key that Windows keeps for your Windows account only. Windows already keeps other standard accounts on this computer out of your data folder; the encryption means an administrator account while you're signed out, a copy of this data folder, or the disk read outside Windows can't read them either. It is only as strong as your Windows password. Anything running as you can still open it, as DotAmi does. ${DATABASE_KEY_LOSS_SENTENCE} ${OLDER_VERSION_SENTENCE} ${DISK_SENTENCE}${leftover}`,
        tone: "ok",
      };
    case "source":
      return {
        headline: "This copy's data file isn't encrypted.",
        detail:
          "A copy run from source has no operating-system key store to keep a key in, and a key kept beside the file it locks would protect nothing, so the file is kept as it is: anyone who can read it can read your ideas, figures, expense records and statements. The desktop app encrypts it.",
        tone: "plain",
      };
    case "off":
      return {
        headline: "Your data file isn't encrypted yet.",
        detail:
          "You chose “Not now” when DotAmi offered to encrypt it, so it is kept as it is: anyone who can read your data folder, a copy of it, or this computer's disk outside Windows can read it. DotAmi asks again the next time it starts.",
        tone: "plain",
      };
    case "never":
      return {
        headline: "Your data file isn't encrypted.",
        detail:
          "You chose to keep it unencrypted, so anyone who can read your data folder, a copy of it, or this computer's disk outside Windows can read it. Turn “Encrypt the data file” on below and DotAmi asks to encrypt it the next time it starts.",
        tone: "plain",
      };
    case "no-key-store":
      return {
        headline: "Your data file isn't encrypted.",
        detail:
          "The key store Windows keeps for your account isn't available to DotAmi right now, so the file is kept as it is: anyone who can read your data folder, a copy of it, or this computer's disk outside Windows can read it. DotAmi tries again each time it starts.",
        tone: "plain",
      };
  }
}
