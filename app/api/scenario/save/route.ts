import { NextResponse } from "next/server";

import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseScenarioInput } from "@/lib/db/parse-scenario-input";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenario = parseScenarioInput(body);
  if (!scenario) {
    return NextResponse.json({ error: "Invalid scenario payload" }, { status: 400 });
  }

  try {
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario);
    return NextResponse.json({ ok: true as const, ventureId });
  } catch (error) {
    console.error("[scenario/save]", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
