import { cockpitWords } from "@/lib/cockpit/words";
import { templatesCatalogV2026 } from "@/lib/engines/templates/v2026";
import type { TemplateReferenceId } from "@/lib/engines/templates/v2026";

interface TemplatesRailProps {
  templateIds: TemplateReferenceId[];
}

const templateById = new Map(
  templatesCatalogV2026.entries.map((entry) => [entry.id, entry]),
);

export function TemplatesRail({ templateIds }: TemplatesRailProps) {
  const templates = templateIds
    .map((id) => templateById.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);

  return (
    <section className="border-t border-rule-soft pt-4">
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{cockpitWords.rail.prepTools}</p>
      <p className="mt-1 text-small leading-snug text-stone-dim">{cockpitWords.rail.prepToolsNote}</p>
      <ul className="mt-3 space-y-2">
        {templates.map((template) => (
          <li key={template.id}>
            <a
              href={template.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-rule bg-ink2 p-2.5 transition hover:border-maple-soft"
            >
              <p className="text-body font-semibold text-paper">{template.label}</p>
              <p className="mt-1 text-small leading-snug text-stone">{template.description}</p>
              <p className="mt-1.5 font-mono text-label text-maple">{cockpitWords.rail.openReference}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
