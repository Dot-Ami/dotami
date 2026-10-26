import { notFound, ok } from "@/lib/api/envelope";
import { getSource, source } from "@/lib/query";
import { archiveMatches } from "@/lib/rules/integrity";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;
  const doc = getSource(sourceId);
  return doc
    ? ok({ ...doc, archiveMatches: archiveMatches(source(sourceId)!) })
    : notFound(`source ${sourceId}`);
}
