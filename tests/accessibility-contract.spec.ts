import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);

function source(path: string) {
  return readFileSync(new URL(path, root), "utf8");
}

describe("accessibility contracts for interactive map controls", () => {
  it("keeps selection state on intake chips", () => {
    expect(source("components/ui/chip.tsx")).toContain("aria-pressed={active}");
  });

  it("names map cards and exposes their selection state", () => {
    const map = source("components/cockpit/strategy-map.tsx");
    // A stage card's left bar is coloured; its name says the colour in words too, so the colour is
    // never the only way to tell (2026-10-11).
    // Since 2026-10-11 a card is a road step (lib/engines/roads/v2026/); the words it says are the same.
    expect(map).toContain("`${step.label}, ${chip.label}, ${COLOUR_WORDS[colour]}, opens detail`");
    // 2026-10-12: a step no rule colours (road 0's before-you-open steps) says so instead of a colour,
    // and opens no panel, so its name says what a click does: it shows where the step leads.
    expect(map).toContain("`${step.label}, no rule reads this step yet, shows where it leads`");
    expect(map).toContain("aria-label={accessibleName}");
    expect(map).toContain('green: "applies as answered"');
    expect(map).toContain('yellow: "check first"');
    expect(map).toContain('gray: "doesn\'t apply as answered"');
    expect(map).toContain(
      'aria-label={`${item.typeChip}: ${item.title}, ${label}${item.fork ? ", fork" : ""}${partial ? ", partial citation" : ""}${fact ? `, ${fact}` : ""}, opens detail`}',
    );
    expect(map).toContain("aria-pressed={selected}");
  });

  it("names preview and node-detail disclosure controls", () => {
    const intake = source("components/discovery/intake-page.tsx");
    const detail = source("components/node-detail-panel.tsx");
    expect(intake).toContain("aria-expanded={expanded}");
    expect(intake).toContain("aria-label={`${expanded ? \"Hide\" : \"Show\"} details for ${item.title}`}");
    expect(detail).toContain("aria-expanded={open}");
    expect(detail).toContain("aria-label={`${open ? \"Hide\" : \"Show\"} details for ${item.title}`}");
  });
});
