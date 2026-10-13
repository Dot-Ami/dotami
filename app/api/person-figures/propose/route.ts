import { NextResponse } from "next/server";

import { futureFailure, guardRead, readBody } from "@/lib/futures/http";
import { proposeIncomeWanted } from "@/lib/futures/person-figures";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
const MAX_BODY_BYTES = 4 * 1024;

/** Keys that would let a caller pick the number's state instead of leaving it to the person. */
const FORBIDDEN_KEYS = ["status", "confirmedAt", "editedByPerson"] as const;

/**
 * POST /api/person-figures/propose { kind: "income-wanted", amountCents, currency? }
 *
 * A number about the person rather than one idea (today only the yearly income they want, before tax;
 * docs/architecture/future-cockpit.md § 7). Like /api/figures/propose it can only create a proposal:
 * anything naming a state is refused with nothing created, and only the person's click in the agree
 * prompt confirms (/api/person-figures/agree, DotAmi's own window only). Open to any caller, as
 * proposing is: *Your destination* uses it, and an agent may later. The amount travels only in the body.
 */
export async function POST(request: Request) {
  // The rate limit only, like the figures' propose route: a proposal changes nothing the person agreed to.
  const limited = guardRead(request, "person-figures-propose", RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = read.body;
  if (!isRecord(body) || FORBIDDEN_KEYS.some((key) => Object.hasOwn(body, key))) {
    return NextResponse.json({ error: "Numbers can only be proposed here. Agreeing is the person's click in the agree prompt." }, { status: 400 });
  }
  if (body.kind !== "income-wanted") {
    return NextResponse.json({ error: "The only number about you DotAmi keeps is the yearly income you want." }, { status: 400 });
  }

  try {
    const figures = await proposeIncomeWanted(prisma, { amountCents: body.amountCents, currency: body.currency });
    return NextResponse.json({ figures }, { status: 201 });
  } catch (error) {
    return futureFailure("person-figures/propose", error);
  }
}
