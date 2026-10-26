import { notFound, ok } from "@/lib/api/envelope";
import { getIssue } from "@/lib/query";

export async function GET(_request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const issue = getIssue(issueId);
  return issue ? ok(issue) : notFound(`issue ${issueId}`);
}
