import type { PrismaClient } from "@prisma/client";

/**
 * The intake's first screen (issue #38, 2026-10-12): *About you* only for a person with no saved idea
 * yet. Someone who already has one has been through it, and their statements are on record, so a second
 * idea starts on the screen they came for; **← Back** still reaches *About you*.
 *
 * Read on the server when the page is drawn, so the first screen never changes under the person. With no
 * database it reads as no saved idea, and the intake starts on *About you*, as it always did. There is one
 * person per copy (no sign-in), so any saved idea is theirs.
 */
export async function intakeFirstScreen(prisma: PrismaClient): Promise<"about" | "confirm"> {
  try {
    return (await prisma.venture.count()) > 0 ? "confirm" : "about";
  } catch {
    return "about";
  }
}
