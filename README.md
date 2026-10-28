# basehub-marketing

Vercel's [BaseHub Marketing Website](https://vercel.com/templates/next.js/basehub-marketing-website)
template ([basehub-ai/marketing-website-template](https://github.com/basehub-ai/marketing-website-template))
— a marketing site whose pages are composed from sixteen section types
(heroes, feature grids, pricing and a comparison table, testimonials, FAQs,
callouts, forms), with a blog, a changelog, RSS feeds, a sitemap, a theme
and navigation all edited in BaseHub — running on **Cloudflare Workers +
Static Assets** through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), deployed by
[Orun](https://github.com/sourceplane/orun) to stage and prod on every merge.
Packaging it as an Orun baseline is the next milestone (BH2). It goes live before its owner has a BaseHub repository at
all.

The template's code is the code and BaseHub stays the SaaS it is. What the
port adds is the Workers build, the monorepo wrapper, a test package and the
deploy contract. What makes it deployable with no BaseHub repository is the
port's own: the template's `basehub` CLI needs a token to build at all, so
the build uses the template's committed types instead, and every query the
pages make is answered — until a token is set — from bundled sample content
projected onto the same selection the BaseHub SDK would send (a visible
"connect BaseHub" bar says so). See
[`specs/epics/basehub-marketing`](specs/epics/basehub-marketing/README.md)
for the design, the milestones and the as-built status.

## What is here (the site)

| Surface | Where |
|---|---|
| Pages (`[[...slug]]`), the blog, the changelog, feeds, sitemap, robots, `/api/health` | `apps/web/src/app` |
| The page sections | `apps/web/src/app/_sections` |
| BaseHub's client, `<Pump>`, events and images — or the sample content when unconnected | `apps/web/src/lib/basehub/{client,pump,events,image,connection}.ts*` |
| The sample content and its projection onto a query | `apps/web/src/lib/basehub/sample`, `apps/web/public/sample` |
| BaseHub's schema types (committed, as upstream) | `apps/web/basehub-types.d.ts` (`pnpm --filter @app/web basehub:types` regenerates them from a connected repository) |
| The site's name and source link (the rename's seam) | `apps/web/src/lib/site.ts` |
| The fonts (Geist, self-hosted, OFL) | `apps/web/src/app/fonts` |
| Workers build and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `component.yaml` |
| Tests | `tests/web` (vitest) |

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build            # next build + opennextjs-cloudflare build → apps/web/.open-next
pnpm --filter @app/web preview   # wrangler dev over the built Worker: the sample content, unconnected
```

That much needs no BaseHub repository: the baseline's own e2e tier
(`testing/e2e.test.sh`) runs exactly this on each landing before a tag, and
a site's developers run it before a push — a site's pull request builds and
dry-deploys it, and does not lint or run the tests. To see your own content:

```bash
cd apps/web
cp .env.example .env.local        # BASEHUB_TOKEN=<the repository's read token>
cd ../..
pnpm --filter @app/web dev        # http://localhost:3000
```

| Variable | Where it is read | What it does |
|---|---|---|
| `BASEHUB_TOKEN` | build time (`next build` inlines it into the server bundle, never the browser's) | The BaseHub repository's read token. A deployed build takes it from its environment's `BASEHUB_TOKEN` secret, best-effort. Unset, the site is unconnected: the sample content under a notice, the forms and analytics events accepted and dropped, no search box and no BaseHub toolbar. |
| `NEXT_PUBLIC_SITE_URL` | build time | The site's origin, for the sitemap, robots, feeds and Open Graph links. The deploy sets it per environment. |

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js hosting (static pages, route handlers) | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets; every page pre-rendered by the build and served from the static-assets incremental cache, as upstream's `force-static` pages are |
| `basehub && next build` — the codegen needs `BASEHUB_TOKEN`, so a build without one fails | `next build` alone: the template's committed `basehub-types.d.ts` are the types, and the SDK's runtime client needs no codegen. Unconnected, every query is answered from the sample content |
| The BaseHub Vercel integration (the token in the project's env, a redeploy on publish) | `BASEHUB_TOKEN` as an optional Orun secret per environment; publishing in BaseHub is followed by a redeploy (Orunbase's Deploy button, or Run workflow on `main`) |
| `VERCEL_PROJECT_PRODUCTION_URL` for the sitemap and feeds, Vercel's `metadataBase` | `NEXT_PUBLIC_SITE_URL`, the environment's `SITE_URL` or its workers.dev URL, and `metadataBase` from it |
| `next/font/google` (Geist) | `next/font/local` over the geist package's variable fonts, shipped with their OFL licence — Google Fonts is unreachable from the build on GitHub's runners |
| A static `public/robots.txt` and sitemaps naming BaseHub's demo domain | `app/robots.ts` and `app/sitemap.ts`, per environment |
| BaseHub images through `basehub/next-image`'s loader | Unchanged for BaseHub assets; the sample content's local images render unoptimized |
| Deploy on push | Orun deploys `<repo>-web-{stage,prod}` on merge to `main` and smoke-tests it (`apps/web/component.yaml`) |
| "Deploy with Vercel" / BaseHub's "Use template" | `orun new --blueprint repo-blueprint.yaml` — a new repository, branded, deployed; BaseHub's "Use template" for the content |

## CI

| Workflow | What it runs | Ships to a site |
|---|---|---|
| `ci.yml` | the Orun pipeline, and the only workflow a site carries: `orun plan --changed`, then one job per lane. A pull request runs the verify lanes (the site built and dry-deployed per environment; they do not lint or run the tests), except the bootstrap's own landings (`orun/BASE-*`), where `plan` alone is the check; a merge deploys stage → prod. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does. A manual run (Orunbase's Deploy button, or Run workflow on `main`) plans the environment and components it names under the push-to-main trigger, so they deploy as a merge deploys them | yes |

## Credits

The site is BaseHub's marketing website template
([basehub-ai/marketing-website-template](https://github.com/basehub-ai/marketing-website-template)).
**Upstream carries no licence**: the repository has no LICENSE file, its
`package.json` declares none and GitHub records none. It is published as a
template for anyone to clone and deploy (Vercel's template gallery, BaseHub's
"Use template"). The sample content and its images were written for this
baseline. Geist is © Vercel, under the SIL Open Font License 1.1
(`apps/web/src/app/fonts/Geist-OFL.txt`).
