import { ok } from "@/lib/api/envelope";
import { searchIssues } from "@/lib/query";

export function GET(request: Request) {
  const url = new URL(request.url);
  return ok(
    searchIssues(url.searchParams.get("q") ?? "", url.searchParams.get("jurisdiction") ?? ""),
  );
}
