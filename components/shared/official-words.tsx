import type { OfficialWords } from "@/lib/engines/shared/types";

/**
 * An official page's own words, quoted as the catalog holds them (lib/engines/shared/types.ts
 * `OfficialWords`). The component adds nothing of its own but the quotation marks and the link.
 */
export function OfficialWordsBlock({ words, className = "" }: { words: OfficialWords; className?: string }) {
  return (
    <figure className={`rounded-md border border-rule bg-ink2 p-2.5 text-body leading-5 ${className}`}>
      <figcaption className="font-mono text-label uppercase tracking-wider text-stone">{words.lead}</figcaption>
      <ul className="mt-1.5 space-y-1.5">
        {words.passages.map((passage) => (
          <li key={passage.id} className="border-l-2 border-rule pl-2 text-paper-dim">
            {passage.sentences.map((sentence, i) => (
              // Each sentence in its own quotation marks, as the page prints it.
              <q key={i} className="mr-1">
                {sentence}
              </q>
            ))}
          </li>
        ))}
      </ul>
      <a
        href={words.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 inline-block font-mono text-small text-maple underline decoration-maple/40 underline-offset-2"
      >
        Read it on the page
      </a>
    </figure>
  );
}
