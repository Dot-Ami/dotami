import { notFound, ok } from "@/lib/api/envelope";
import { getClaim } from "@/lib/query";

export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const claim = getClaim(claimId);
  return claim ? ok(claim) : notFound(`claim ${claimId}`);
}
