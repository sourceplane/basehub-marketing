# basehub-marketing — implementation plan

Three milestones, each one reviewed pull request (BH0 is the repository's
first commit), each green before it merges.

## BH0 — the spec (BH-1)

The repository is born: `intent.yaml` with the placeholder workspace
`ws_CHANGE_ME`, `ci.yml` (turso-starter's, with cms-sanity's changes, which
plans nothing until the workspace is set), the shared TypeScript and ESLint
configuration, the spec index, this doc set and the task contracts.

## BH1 — the marketing site on Workers (BH-2)

- The template's `src/`, `public/` and configuration in `apps/web`; Next
  pinned to 16.3.8, every other dependency at the version upstream's lockfile
  resolved; `@opennextjs/cloudflare`, `wrangler`, `server-only`.
- `next.config.ts`: the template's image hosts, `BASEHUB_TOKEN` inlined into
  the server bundle, `output: 'standalone'`, the workspace root for the
  trace. `open-next.config.ts` with the static-assets incremental cache;
  `wrangler.jsonc`. `build` is `next build` and the OpenNext build, no
  `basehub` CLI.
- The unconnected sample mode: the four wrappers in `src/lib/basehub`, the
  sample tree and its projection, `public/sample`, the bar; the toolbar and
  search shown only when connected.
- Geist self-hosted; `siteUrl` from `NEXT_PUBLIC_SITE_URL`; `app/robots.ts`;
  `/api/health`.
- `SITE_NAME` and `SOURCE_URL` in `src/lib/site.ts`.
- `component.yaml`: the deploy contract, the token's optional secret ref,
  the origin per environment and the smoke. `tests/web`: the identity, the
  projection, the sample's links, images, section types and fragments, the
  connected/unconnected switch and the health route.
- The README's "How it maps to Vercel".

## BH2 — a baseline (BH-3)

cms-contentful's machinery, renamed: `blueprint.yaml`, `repo-blueprint.yaml`,
`.baseline/` (identity, the product's README with "Connecting BaseHub",
task contracts), `tooling/rebrand`, `tooling/bootstrap`,
`hooks/render-deployment-docs.sh` (probing `/`, `/blog` and `/api/health`,
recording whether each site reads a repository yet, and the custom domain
when `SITE_URL` is set), `docs/phases/`, the context pack, `testing/` (the
leak and placement gates on this tree's files; the e2e tier reading every
route the site promises, then building and serving it connected to a
stand-in BaseHub) and `baseline.yml` / `tag.yml`.
