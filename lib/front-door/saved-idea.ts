import type { PrismaClient } from "@prisma/client";

/**
 * Whether the person has a saved idea, for the front door (2026-10-23): *Your futures* and *Open cockpit* are
 * offered only then, since for a brand-new person both opened empty pages. There is one person per copy (no
 * sign-in), so any saved idea is theirs, as for the intake's first screen (lib/journey/intake-start.ts). Read
 * on the server when the page is drawn; with no database it reads as none, and the links stay away.
 */
export async function hasSavedIdea(prisma: Pick<PrismaClient, "venture">): Promise<boolean> {
  try {
    return (await prisma.venture.count()) > 0;
  } catch {
    return false;
  }
}
