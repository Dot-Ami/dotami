import Link from "next/link";

/** The state of an issue nobody has researched: said plainly, with nothing filled in by guesswork. */
export function NotResearched({ title }: { title: string }) {
  return (
    <div className="rounded border border-open bg-open-bg p-4" data-testid="not-researched">
      <h2 className="font-semibold">Not researched yet</h2>
      <p className="mt-1">
        &ldquo;{title}&rdquo; is listed because people asked about it. No evidence has been gathered
        or reviewed, so this page can&rsquo;t say what is happening, who decides, or what anyone can
        do. It won&rsquo;t fill the gap with a summary from nowhere.
      </p>
      <p className="mt-2 text-sm">
        In a real deployment, this is where a volunteer researcher would pick it up: find the
        decision record, the responsible body and its process, and start the evidence file.{" "}
        <Link href="/method">How issues are researched</Link>.
      </p>
    </div>
  );
}
