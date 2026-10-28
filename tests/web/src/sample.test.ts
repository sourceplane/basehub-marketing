import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { SAMPLE } from "@/lib/basehub/sample/content";
import { sampleQuery } from "@/lib/basehub/sample";
import { authorFragment, buttonFragment, darkLightImageFragment, headingFragment, quoteFragment } from "@/lib/basehub/fragments";

const WEB = resolve(__dirname, "../../../apps/web");

function walk(value: unknown, visit: (v: Record<string, unknown>) => void) {
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === "object") {
    visit(value as Record<string, unknown>);
    Object.values(value).forEach((v) => walk(v, visit));
  }
}

const pages = SAMPLE.site.pages.items;
const routes = new Set([...pages.map((p) => p.pathname), "/blog", "/changelog"]);

describe("the sample content", () => {
  it("has the pages the header and footer link to", () => {
    const hrefs: string[] = [];
    walk(SAMPLE.site.header, (v) => {
      if (typeof v.href === "string") hrefs.push(v.href);
      if (v.__typename === "CustomTextComponent" && typeof v.text === "string") hrefs.push(v.text);
      if (v.__typename === "PageReferenceComponent") hrefs.push((v.page as { pathname: string }).pathname);
    });
    walk(SAMPLE.site.footer.navbar, (v) => typeof v.url === "string" && hrefs.push(v.url));
    const internal = hrefs.filter((h) => h.startsWith("/"));
    expect(internal.length).toBeGreaterThan(4);
    for (const href of internal) expect(routes, href).toContain(href);
  });

  it("points every button at a page it has", () => {
    walk(SAMPLE, (v) => {
      if (v.__typename === "ButtonComponent" && typeof v.href === "string" && v.href.startsWith("/")) {
        expect(routes, `button ${String(v.label)}`).toContain(v.href);
      }
    });
  });

  it("ships every image it names", () => {
    walk(SAMPLE, (v) => {
      if (v.__typename === "BlockImage" || v.__typename === "BlockOgImage") {
        const url = String(v.url);
        expect(url.startsWith("/sample/"), url).toBe(true);
        expect(existsSync(resolve(WEB, "public", `.${url}`)), url).toBe(true);
      }
    });
  });

  it("only uses section types the page renders", () => {
    const page = readFileSync(resolve(WEB, "src/app/[[...slug]]/page.tsx"), "utf8");
    const handled = new Set([...page.matchAll(/case "(\w+)":/g)].map((m) => m[1]));
    for (const p of pages) for (const s of p.sections as { __typename: string }[]) expect(handled, `${p.pathname}: ${s.__typename}`).toContain(s.__typename);
  });

  it("has unique paths and slugs", () => {
    const uniq = (xs: string[]) => new Set(xs).size === xs.length;
    expect(uniq(pages.map((p) => p.pathname))).toBe(true);
    expect(uniq(SAMPLE.site.blog.posts.items.map((p) => p._slug))).toBe(true);
    expect(uniq(SAMPLE.site.changelog.posts.items.map((p) => p._slug))).toBe(true);
  });

  it("answers the shared fragments with no missing field", () => {
    // Every field these fragments ask for is required by the template's
    // types except a button's icon, which BaseHub leaves null without one.
    const nulls: string[] = [];
    const check = (value: unknown, path: string) => {
      if (value === null) nulls.push(path);
      else if (Array.isArray(value)) value.forEach((v, i) => check(v, `${path}[${i}]`));
      else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => check(v, `${path}.${k}`));
    };
    const quotes = sampleQuery({ site: { pages: { items: { sections: { on_TestimonialSliderComponent: { heading: headingFragment, quotes: quoteFragment } } } } } });
    check(quotes, "quotes");
    const post = sampleQuery({ site: { blog: { posts: { items: { authors: authorFragment, image: darkLightImageFragment } } } } });
    check(post, "post");
    const ctas = sampleQuery({ site: { header: { rightCtas: { items: buttonFragment } } } });
    check(ctas, "ctas");
    expect(nulls.filter((p) => !p.endsWith(".icon"))).toEqual([]);
  });

  it("names the site in its metadata", async () => {
    const { SITE_NAME } = await import("@/lib/site");
    const data = sampleQuery({ site: { settings: { metadata: { sitename: true, titleTemplate: true } } } });
    expect(data.site.settings.metadata.sitename).toBe(SITE_NAME);
    expect(data.site.settings.metadata.titleTemplate).toContain("%s");
  });
});
