/**
 * Run as its own process by tests/prisma-log.spec.ts (through tsx), so the test can read exactly
 * what reaches the real stdout and stderr — the two streams the desktop app copies into
 * logs/server.log. It uses the app's own client (lib/prisma.ts) on the database named by
 * DATABASE_URL, and makes one write that is built wrongly on purpose: the statement's text is a
 * number, and the day it was said is missing. Prisma refuses it, and its message quotes the
 * values it was given, the user id here carrying the marker.
 *
 * This script prints one sentinel line of its own, which never contains the marker.
 */
import { prisma } from "../../lib/prisma";

const marker = process.env.PRIVACY_TEST_MARKER ?? "";

// A function, not top-level await: the package isn't an ES module, so tsx runs this as CommonJS.
async function main(): Promise<void> {
  try {
    // `as never`: the type checker would refuse this call, which is the point.
    await prisma.personStatement.create({ data: { userId: marker, text: 12345 } as never });
    console.log("write-unexpectedly-succeeded");
  } catch (error) {
    // Proves the error handed back to the caller does quote the values — that is what the client's
    // own report used to copy into the log.
    const quotes = String(error).includes(marker);
    console.log(`thrown-error-quotes-the-marker: ${quotes}`);
  }
  await prisma.$disconnect();
}

void main();
