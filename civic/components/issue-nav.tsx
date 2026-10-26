import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "evidence", label: "Evidence", path: "/evidence" },
  { key: "organisations", label: "Organisations", path: "/organisations" },
  { key: "timeline", label: "Decisions & authority", path: "/timeline" },
  { key: "actions", label: "Actions", path: "/actions" },
  { key: "coalition", label: "Coalition", path: "/coalition" },
] as const;

export type IssueTab = (typeof TABS)[number]["key"];

export function IssueNav({
  issueId,
  title,
  current,
}: {
  issueId: string;
  title: string;
  current: IssueTab;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm text-muted">
        <Link href="/">Issues</Link> / <span>{title}</span>
      </p>
      <nav aria-label="Issue sections" className="mt-3 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/issues/${issueId}${tab.path}`}
            aria-current={tab.key === current ? "page" : undefined}
            className={`-mb-px rounded-t border px-3 py-1.5 text-sm no-underline ${
              tab.key === current
                ? "border-line border-b-paper bg-paper font-semibold text-ink"
                : "border-transparent text-doc hover:bg-card"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
