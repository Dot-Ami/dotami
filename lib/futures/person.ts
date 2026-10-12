import type { PrismaClient } from "@prisma/client";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * The id of the one person this copy belongs to, creating the placeholder record on the first write,
 * the same way saving an idea or a statement does (there is no sign-in). Skill marks and the person's
 * own numbers hang off it, not off any idea.
 */
export async function ensurePersonUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: STUB_EMAIL },
    create: { email: STUB_EMAIL, name: "Stub user" },
    update: {},
    select: { id: true },
  });
  return user.id;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar day a moment fell on, on this computer (not in UTC, which reads as tomorrow every
 * evening west of Greenwich). DotAmi's server runs on the person's own computer, so its clock is theirs.
 */
export function dayOnThisComputer(moment: Date): string {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}
