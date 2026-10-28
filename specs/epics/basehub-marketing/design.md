# basehub-marketing — design

## 1. The template

BaseHub's [marketing website template](https://github.com/basehub-ai/marketing-website-template)
(Next.js App Router, Tailwind CSS 4, Geist, Radix) is a site whose every word
is in a BaseHub repository. A page (`app/[[...slug]]`) is a list of section
blocks — hero, companies, feature cards, side-by-side and big-image
features, a features grid, testimonials (slider and grid), pricing and a
comparison table, FAQs, callouts, forms, freeform text — chosen by
`__typename` in one switch. The blog (`/blog`, `/blog/[slug]`) has authors,
categories, rich-text bodies with code blocks (shiki), BaseHub's search and
an RSS feed; the changelog likewise. The header, footer, theme colours, logo
and metadata are BaseHub settings; the newsletter and contact forms send
BaseHub events. Every read goes through the `basehub` SDK: its `basehub()`
client and `<Pump>` turn a selection object into GraphQL, and its build step
(`basehub && next build`) regenerates `basehub-types.d.ts` from the
repository's schema — which needs `BASEHUB_TOKEN`. The pages are
`force-static` with `generateStaticParams`: everything is rendered at build.

## 2. How it maps to Cloudflare

| Vercel | Here | Why |
|---|---|---|
| Next.js hosting | One Worker built by `@opennextjs/cloudflare` (`output: 'standalone'`), `public/` and the client chunks in its Static Assets, the static-assets incremental cache | Every page is pre-rendered; nothing in the Worker is revalidated |
| `basehub && next build` | `next build` alone; `basehub:types` regenerates the types by hand | The CLI fails without a token, and the template already commits `basehub-types.d.ts`; the SDK's runtime client builds its GraphQL from the selection with no codegen |
| `BASEHUB_TOKEN` from the BaseHub Vercel integration | An optional Orun secret per environment, read at build and inlined into the SERVER bundle (`next.config.ts` `env`) | The build decides connected or not; request-time routes (the health check, an unknown path, the feeds) see the same answer |
| A redeploy on publish (the integration's hook) | A redeploy by hand or the `# orun: redeploy` stamp | Pages are pre-rendered; a commit in BaseHub needs a build (risk BH-D) |
| `VERCEL_PROJECT_PRODUCTION_URL`, a static `robots.txt` and sitemaps naming BaseHub's demo domain | `NEXT_PUBLIC_SITE_URL` per environment (its `SITE_URL`, else its workers.dev URL); `app/robots.ts`, `app/sitemap.ts` | Absolute links for the environment that serves them |
| `next/font/google` | `next/font/local` over the `geist` package's variable fonts, shipped with the OFL | Google Fonts is unreachable from the build on GitHub's runners |
| `basehub/next-image`'s loader | Unchanged for BaseHub assets; local sample images unoptimized | BaseHub's CDN sizes its images; the Worker has no optimiser |

## 3. The unconnected site

The platform brokers Cloudflare, not BaseHub, so a bootstrap deploys a site
whose owner has no repository yet. Upstream's build would stop at "Token not
found". Here a build without `BASEHUB_TOKEN` is **unconnected**: four local
wrappers stand between the template and the SDK —
`src/lib/basehub/{client,pump,events,image}` — and every import of
`basehub()`, `<Pump>`, `sendEvent` and `<BaseHubImage>` goes through them.
Connected, each delegates to the SDK unchanged. Unconnected, the client and
`<Pump>` answer every query from `src/lib/basehub/sample`: a content tree in
the repository's shape (the types in `basehub-types.d.ts`), projected onto
the very selection the SDK would have sent — the fields asked for, union
members by `on_<Type>`, a collection's `filter` / `orderBy` / `first` /
`skip` — so the template's pages, unchanged, render five pages, three posts
and three releases, with images in `public/sample`. The layout shows a
"connect BaseHub" bar (`data-basehub="not-connected"`); the forms' events
are accepted and dropped; the blog hides its search box and the layout the
BaseHub toolbar, which each need a repository; `/api/health` answers
`"content":"sample"`. Every word and image of the sample is written for the
baseline: the template's own demo content lives in BaseHub and is not
copied (risk BH-C).

## 4. The repository

cms-sanity's shape (turso v8): `apps/web` (type
`cloudflare-workers-assets-turbo`, lane `isolated`) and `tests/web` (type
`turbo-package`, a vitest suite run on the `dev` rung). No infrastructure:
BaseHub is a hosted service. The site's name is one seam, `SITE_NAME` in
`src/lib/site.ts`, read by the sample content's settings (site name and title
template); once connected, the name is the BaseHub repository's setting.
`SOURCE_URL` beside it is the site's own repository, linked from the sample
footer, and renamed with it.

## 5. The build

`next build` (Turbopack), `opennextjs-cloudflare build --skipBuild`, then
`populateCache local`. `repo-blueprint.yaml` is cms-sanity's: one landing
(`01-product`) places, brands and lands the whole tree, one convergence
builds and deploys stage and prod side by side, and `02-docs` records what
went live. The smoke checks the home page links the blog and `/api/health`
answers. The Worker is 16 MiB raw, 3.1 MiB gzipped — the code-block
renderer's shiki carries every grammar — so the account needs Workers Paid
(risk BH-F).

The end-to-end tier proves the connected build without the real service: a
stand-in (`testing/lib/fake-basehub.mjs`) serves the SDK's GraphQL endpoint
and ref resolver on localhost, where `BASEHUB_DEBUG_FORCED_URL` points it
(the SDK's own override, passed through `turbo.json`). It answers from the
sample tree made different (another site name, hero, first post and image
host) with its own executor over the parsed queries — written apart from the
unconnected projection, so the two cannot share a mistake.

## 6. Out of scope

- Connected forms, search and draft mode against BaseHub itself: each needs a
  real repository, and the stand-in answers queries only (risk BH-B).
- Rebuilding on publish (a BaseHub webhook to the deploy workflow): an
  owner's choice, and a credential the bootstrap does not hold.
- Trimming shiki's grammars to get under Workers Free: a code block's
  language is the editor's free choice.

## 7. The alternative rejected

**Rendering on request, as cms-contentful does.** `force-dynamic` pages
would keep the build independent of BaseHub and show a commit on the next
visit, but each page is a dozen `<Pump>` queries (header, footer, theme,
sections, events), the SDK tags its fetches for a cache the static-assets
one cannot write, and the template is built around `force-static` and
`generateStaticParams`. Pre-rendering keeps the template as it is, serves
every page from the Worker's assets with no request to BaseHub, and costs a
redeploy per publish — which the sample mode makes safe: a build with no
token is the unconnected site, never a failed one.
