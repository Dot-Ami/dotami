import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

describe("shared legal and source footer", () => {
  it("keeps the disclaimer and preparation context visible", () => {
    expect(layout).toContain("Information, not legal or tax advice");
    expect(layout).toContain("a prep tool for you and your accountant");
  });

  it("links the source label to the public repository", () => {
    expect(layout).toContain('href="https://github.com/Dot-Ami/dotami"');
    expect(layout).toContain("open source on GitHub");
    expect(layout).toContain('target="_blank"');
    expect(layout).toContain('rel="noreferrer"');
  });
});
