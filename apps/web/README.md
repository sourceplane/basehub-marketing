# apps/web — the site

BaseHub's [marketing website template](https://github.com/basehub-ai/marketing-website-template),
running on Cloudflare Workers + Static Assets:

- Pages composed in BaseHub from section blocks (`app/[[...slug]]`,
  `app/_sections`), a blog and a changelog with RSS feeds, a sitemap,
  robots, a theme and navigation — all read over BaseHub's GraphQL API
  through the `basehub` SDK (`src/lib/basehub`)
- Every page rendered by the build (`force-static`, as upstream) and served
  from the Worker's static-assets cache
- Tailwind CSS 4, Geist self-hosted (`src/app/fonts`), BaseHub images through
  `basehub/next-image`, code blocks highlighted by shiki
- The newsletter and contact forms send BaseHub events; the blog searches
  with BaseHub's search

With no `BASEHUB_TOKEN` at build time the site is **unconnected**: every
query is answered from the sample content in `src/lib/basehub/sample`,
projected onto the same selection the SDK would send, under a bar that says
how to connect; the forms accept and drop their submissions, and the blog
has no search box. `/api/health` says which (`"content":"sample"` or
`"basehub"`). The site's name is in `src/lib/site.ts`.

```bash
pnpm dev            # next dev on http://localhost:3000
pnpm build          # next build + opennextjs-cloudflare build → .open-next/
pnpm preview        # wrangler dev over the built Worker
BASEHUB_TOKEN=<token> pnpm basehub:types   # regenerate basehub-types.d.ts from the repository's schema
```

How it is connected to a BaseHub repository and deployed — per environment,
on merge to `main` — is the repository's README and `component.yaml` beside
this file.
