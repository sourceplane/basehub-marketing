# basehub-marketing — implementation status

| Milestone | State | Landed |
|---|---|---|
| BH0 — the spec | ✅ | the repository's first commit, BH-1 |
| BH1 — the marketing site on Workers | ✅ | BH-2 |
| BH2 — a baseline | ✅ | BH-3, tagged `baseline-v1` |

The Worker is 16.0 MiB raw, 3.1 MiB gzipped (3186 KiB) — over Workers
Free's 3 MiB, inside Paid's 10 MiB (risk BH-F).

## Departures from the upstream template

Everything not listed here is the template as it is upstream at `7cfc403`.

| # | What | Why |
|---|---|---|
| 1 | The app lives in `apps/web` of a pnpm workspace; upstream's `.eslintrc.json`, `.eslintignore`, `.editorconfig`, `.nvmrc`, `.vscode`, `.gitignore` and lockfile give way to the workspace's | One lockfile, the workspace's lint and TypeScript configuration |
| 2 | Next 16.3.8 (upstream 16.0.9) and `eslint-config-next` 16.3.8 on ESLint 9's flat config; `@opennextjs/cloudflare`, `wrangler` and `server-only` added; every other dependency pinned to the version upstream's lockfile resolved | OpenNext supports 16.3; a reproducible build |
| 3 | `build` is `next build` then the OpenNext build (upstream: `basehub && next build`); `basehub:types` runs the codegen on demand; `dev` is `next dev` | The `basehub` CLI needs a token; the committed `basehub-types.d.ts` are the types, and the SDK's runtime client needs no codegen |
| 4 | `next.config.ts`: `env` inlining `BASEHUB_TOKEN` into the server bundle, `output: 'standalone'`, `outputFileTracingRoot` at the workspace root; `open-next.config.ts` (static-assets incremental cache) and `wrangler.jsonc`; `turbo.json` keys the build on `BASEHUB_TOKEN`, `BASEHUB_DEBUG_FORCED_URL` and `NEXT_PUBLIC_SITE_URL` | The Workers build; the repository fixed per environment at build |
| 5 | `src/lib/basehub/{client,pump,events,image}.ts*` wrap `basehub()`, `<Pump>`, `sendEvent` and `<BaseHubImage>`, and every import of them goes through the wrappers (`fragmentOn` and the types still come from `basehub`) | The unconnected mode in one place (design §3) |
| 6 | The unconnected sample mode: `src/lib/basehub/sample` (the content tree and its projection onto a selection), `public/sample/*.svg`, `_components/connect-basehub.tsx` in the layout | A fresh product has no repository |
| 7 | Unconnected, the BaseHub toolbar is not rendered, the blog's search box is hidden, and the forms' events are accepted and dropped (`sample:` keys) | Each needs a repository: the toolbar's draft mode, the search key, the ingest key |
| 8 | Geist through `next/font/local` from the `geist` package's variable fonts, with the OFL in `src/app/fonts` (upstream: `next/font/google`) | Google Fonts is unreachable from the build on GitHub's runners |
| 9 | `siteUrl` from `NEXT_PUBLIC_SITE_URL` (upstream: `VERCEL_PROJECT_PRODUCTION_URL`, falling back to BaseHub's demo domain); `metadataBase` from it | Absolute links for each environment |
| 10 | `public/robots.txt`, `sitemap.xml` and `sitemap-0.xml` removed (they named BaseHub's demo domain); `app/robots.ts` added; `app/sitemap.ts` loses its `revalidate` | Generated for the environment's origin; no ISR on the static-assets cache |
| 11 | `app/api/health/route.ts`: `{"ok":true,"content":"sample"|"basehub"}` | The smoke, the e2e tier and the deployment record read it |
| 12 | `SITE_NAME` and `SOURCE_URL` in `src/lib/site.ts`, read by the sample content | The rename seam; the site's own repository in the sample footer |
| 13 | ESLint: `react-hooks/set-state-in-effect` and `react-hooks/refs` off | `eslint-plugin-react-hooks` 7 (with `eslint-config-next` 16) flags upstream's components; rewriting them is not the port's |
| 14 | `tsconfig.json`: target `esnext`; `.open-next` and `.wrangler` excluded | The Workers build output is not source |
| 15 | `tests/web` (vitest) | The template ships none |

Kept as upstream, and worth knowing: the page switch lists
`case "FaqComponent"` twice, so the accordion FAQ variant is unreachable;
`dynamicParams` stays on, so an unknown path is rendered on request and
answers 404 (OpenNext logs a "Failed to set" for the read-only cache).

## The baseline

cms-contentful's machinery (cms-sanity's, renamed), with BaseHub in place of
Contentful: one optional secret (`BASEHUB_TOKEN`) where Contentful had two,
and no Worker secrets; the smoke on `/` and `/api/health`; the deployment
record probing `/`, `/blog` and `/api/health` and the `SITE_URL` origin
when set; the e2e tier reading every sample route, then building the lane
again against a stand-in BaseHub and reading the stand-in's site back. The
leak and placement gates' factory-path rule no longer reads an `@/hooks/`
import (the app's own alias) as the factory's `hooks/`.

`expectedMinutes` is 13: cms-contentful's 12-minute one-landing estimate
plus one for this Worker's larger upload, until a bootstrap measures it.
