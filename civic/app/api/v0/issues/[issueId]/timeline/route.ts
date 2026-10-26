import { notFound, ok } from "@/lib/api/envelope";
import { getIssue, getTimeline } from "@/lib/query";

export async function GET(_request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return getIssue(issueId) ? ok(getTimeline(issueId)) : notFound(`issue ${issueId}`);
}
