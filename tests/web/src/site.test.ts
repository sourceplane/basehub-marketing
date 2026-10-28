import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const SITE = resolve(__dirname, "../../../apps/web/src/lib/site.ts");

describe("the site's name (apps/web/src/lib/site.ts)", () => {
  it("is one literal line the rename can rewrite", () => {
    const m = /^export const SITE_NAME = (".*");$/m.exec(readFileSync(SITE, "utf8"));
    expect(m, "SITE_NAME line").not.toBeNull();
    expect(JSON.parse(m?.[1] ?? '""').trim()).not.toBe("");
  });

  it("points the source link at a repository", async () => {
    const { SOURCE_URL } = await import("@/lib/site");
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  });
});

describe("the site's origin (apps/web/src/lib/constants)", () => {
  it("is the build's NEXT_PUBLIC_SITE_URL, without a trailing slash", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://acme.example/";
    vi.resetModules();
    const mod = await import("@/lib/constants");
    expect(mod.siteUrl).toBe("https://acme.example");
    expect(mod.siteHost).toBe("acme.example");
  });
});
