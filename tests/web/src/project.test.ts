import { describe, expect, it } from "vitest";

import { project } from "@/lib/basehub/sample/project";

const tree = {
  site: {
    title: "Site",
    logo: { url: "/a.svg", alt: "A", width: 10 },
    pages: {
      items: [
        { pathname: "/", _title: "Home", sections: [
          { __typename: "HeroComponent", _id: "h", title: "Hi" },
          { __typename: "FaqComponent", _id: "f", heading: { title: "Q" } },
        ] },
        { pathname: "/about", _title: "About", sections: [] },
      ],
    },
    posts: {
      items: [
        { _slug: "b", _sys: { slug: "b" }, publishedAt: "2026-01-02", _title: "B" },
        { _slug: "a", _sys: { slug: "a" }, publishedAt: "2026-03-01", _title: "A" },
        { _slug: "c", _sys: { slug: "c" }, publishedAt: "2026-02-01", _title: "C" },
      ],
    },
    body: { json: { content: [{ type: "paragraph" }], toc: [] } },
  },
};

describe("projecting the sample tree onto a BaseHub selection", () => {
  it("returns exactly the fields asked for", () => {
    expect(project(tree, { site: { title: true, logo: { url: true } } })).toEqual({
      site: { title: "Site", logo: { url: "/a.svg" } },
    });
  });

  it("answers a scalar asked for with __args, and a JSON scalar whole", () => {
    expect(project(tree, { site: { logo: { url: { __args: { width: 100 } } }, body: { json: { content: true, toc: 1 } } } })).toEqual({
      site: { logo: { url: "/a.svg" }, body: { json: { content: [{ type: "paragraph" }], toc: [] } } },
    });
  });

  it("maps arrays and picks union members by __typename", () => {
    const out = project(tree, {
      site: { pages: { items: { sections: { __typename: true, on_HeroComponent: { title: true }, on_FaqComponent: { heading: { title: true } } } } } },
    }) as any;
    expect(out.site.pages.items[0].sections).toEqual([
      { __typename: "HeroComponent", title: "Hi" },
      { __typename: "FaqComponent", heading: { title: "Q" } },
    ]);
  });

  it("filters a collection on a field and on the system slug, and takes the first", () => {
    const byPath = project(tree, { site: { pages: { __args: { filter: { pathname: { eq: "/about" } }, first: 1 }, items: { _title: true } } } }) as any;
    expect(byPath.site.pages.items).toEqual([{ _title: "About" }]);
    const bySlug = project(tree, { site: { posts: { __args: { filter: { _sys_slug: { eq: "c" } } }, items: { _title: true } } } }) as any;
    expect(bySlug.site.posts.items).toEqual([{ _title: "C" }]);
    const none = project(tree, { site: { posts: { __args: { filter: { _sys_slug: { eq: "zzz" } } }, items: { _title: true } } } }) as any;
    expect(none.site.posts.items).toEqual([]);
  });

  it("orders a collection by a field, newest first on __DESC", () => {
    const out = project(tree, { site: { posts: { __args: { orderBy: "publishedAt__DESC" }, items: { _slug: true } } } }) as any;
    expect(out.site.posts.items.map((p: { _slug: string }) => p._slug)).toEqual(["a", "c", "b"]);
  });

  it("skips fragment markers and answers null for what the tree lacks", () => {
    expect(project(tree, { site: { __fragmentOn: "Site", title: true, missing: true } })).toEqual({ site: { title: "Site", missing: null } });
  });
});
