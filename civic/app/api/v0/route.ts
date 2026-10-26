import { ok } from "@/lib/api/envelope";

// The index: what this read-only API offers. Each operation maps one-to-one to a function in
// lib/query.ts, and to a planned MCP tool of the same name (ARCHITECTURE.md § MCP).
export function GET() {
  return ok({
    readOnly: true,
    operations: [
      { name: "search_issues", method: "GET", path: "/api/v0/issues?q={text}&jurisdiction={id}" },
      { name: "get_issue", method: "GET", path: "/api/v0/issues/{issueId}" },
      { name: "get_claim_evidence", method: "GET", path: "/api/v0/claims/{claimId}" },
      { name: "get_decision_timeline", method: "GET", path: "/api/v0/issues/{issueId}/timeline" },
      { name: "get_action_options", method: "GET", path: "/api/v0/issues/{issueId}/actions" },
      { name: "get_source", method: "GET", path: "/api/v0/sources/{sourceId}" },
    ],
    notes: [
      "No operation sends, files, publishes or contacts anything.",
      "Deadline states are computed against demoClock, not the real date.",
      "Quotations are the source passages' own text; follow sourceId and passage id to the source.",
    ],
  });
}
