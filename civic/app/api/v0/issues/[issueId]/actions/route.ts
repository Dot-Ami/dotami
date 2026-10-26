import { notFound, ok } from "@/lib/api/envelope";
import { getActions, getIssue } from "@/lib/query";

export async function GET(_request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  // Drafting templates are left out: the API describes routes, it doesn't prepare submissions.
  if (!getIssue(issueId)) return notFound(`issue ${issueId}`);
  const actions = getActions(issueId);
  const strip = <T extends { draftTemplate?: string }>(routes: T[]) =>
    routes.map(({ draftTemplate: _omit, ...rest }) => rest);
  return ok({
    ...actions,
    open: strip(actions.open),
    checkDate: strip(actions.checkDate),
    noDeadline: strip(actions.noDeadline),
    closed: strip(actions.closed),
  });
}
