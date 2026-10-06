import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { allowedHostsFromEnv, hostName, isAllowedHost } from "@/lib/http/allowed-host";

/** The DNS-rebinding guard (lib/http/allowed-host.ts, applied in middleware.ts). */
describe("allowed hosts", () => {
  it("answers on this computer's own names, with or without a port", () => {
    for (const host of ["localhost", "localhost:3000", "127.0.0.1:49839", "[::1]:3001", "LOCALHOST:3000", "dotami.localhost:3000"]) {
      expect(isAllowedHost(host)).toBe(true);
    }
  });

  it("refuses every other name — the attacker's domain in a rebinding attack — and a missing Host", () => {
    for (const host of ["evil.example", "evil.example:3155", "127.0.0.1.evil.example", "localhost.evil.example:3000", "192.168.1.5:3000", "", null]) {
      expect(isAllowedHost(host)).toBe(false);
    }
  });

  it("answers on extra names only when the person lists them (DOTAMI_ALLOWED_HOSTS)", () => {
    const extra = allowedHostsFromEnv(" 192.168.1.5 , My-PC ");
    expect(extra).toEqual(["192.168.1.5", "my-pc"]);
    expect(isAllowedHost("192.168.1.5:3000", extra)).toBe(true);
    expect(isAllowedHost("my-pc:3000", extra)).toBe(true);
    expect(isAllowedHost("evil.example", extra)).toBe(false);
    expect(allowedHostsFromEnv(undefined)).toEqual([]);
  });

  it("reads the name out of a Host header", () => {
    expect(hostName("Example.COM:8080")).toBe("example.com");
    expect(hostName("[::1]:3000")).toBe("[::1]");
  });

  it("is applied to every request in middleware.ts, before anything else, with no prefetch skip in the matcher", () => {
    const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
    const body = middleware.slice(middleware.indexOf("export function middleware"));
    expect(body.indexOf("isAllowedHost(")).toBeGreaterThan(-1);
    expect(body.indexOf("isAllowedHost(")).toBeLessThan(body.indexOf("randomUUID"));
    const config = middleware.slice(middleware.indexOf("export const config"));
    expect(config).not.toContain("missing");
    expect(config).not.toMatch(/\(\?!api/);
  });
});
