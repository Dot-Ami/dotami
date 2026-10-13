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
    // Since 2026-10-12 the cockpit's overlay badges ("needs 3 · you have 2") are read out in the name too,
    // between the colour and the action; with no overlay on, the name is what it was.
    // Since 2026-10-12 a card the person marked not for me says "set aside by you" in place of the colour's
    // words: its grey is their choice, not a reading of their answers.
    expect(map).toContain("`${step.label}, ${chip.label}, ${colourWords}, ${badges.map((b) => `${b}, `).join(\"\")}opens detail`");
    expect(map).toContain("colourWords={setAsideByYou ? cockpitWords.road.setAside : ruled ? COLOUR_WORDS[colour] : null}");
    // 2026-10-12: drawn without road evaluation, a step no rule colours (road 0's before-you-open steps)
    // says so instead of a colour. In the cockpit, road evaluation gives every step a state.
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

  // 2026-10-12: the intake's group names were plain <p>s tied to nothing, so the province and
  // employment dropdowns had no name for a screen reader. FieldGroup now draws a <label> for a group
  // given its field's id; the browser test finds the dropdowns by those names (e2e/app.spec.ts).
  it("ties the intake's field names to the province, employment and name fields", () => {
    const intake = source("components/discovery/intake-page.tsx");
    expect(intake).toContain("<label htmlFor={htmlFor}");
    for (const id of ["intake-province", "intake-employment", "intake-name"]) {
      expect(intake, id).toContain(`htmlFor="${id}"`);
      expect(intake, id).toContain(`id="${id}"`);
    }
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
