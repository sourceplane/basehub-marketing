# basehub-marketing — BaseHub's marketing website template on Cloudflare Workers

**The template's marketing site — pages composed in BaseHub from section
blocks, a blog and a changelog — pre-rendered by the build and served by one
Cloudflare Worker with its static assets, deployed by Orun to stage and prod
on every merge, live before its owner has a BaseHub repository at all, and
the baseline that makes a copy of it somebody else's site in one landing.**

| | |
|---|---|
| Status | In progress — BH0 on main |
| Upstream | [basehub-ai/marketing-website-template](https://github.com/basehub-ai/marketing-website-template), at `7cfc403` (2025-12-11). **No licence**: no LICENSE file, no `license` in `package.json`, none recorded by GitHub (risk BH-C) |
| Reference | [cms-sanity](https://github.com/sourceplane/cms-sanity) and [cms-contentful](https://github.com/sourceplane/cms-contentful) — the same scaffolding, tests and bootstrap, and the unconnected sample mode |
| Key | `BH` |

## Read in this order

1. [design.md](design.md) — the template, how each Vercel piece maps to
   Cloudflare, the unconnected site, the repository and the build, and the
   alternative rejected.
2. [implementation-plan.md](implementation-plan.md) — the milestones and
   what each one lands.
3. [risks-and-open-questions.md](risks-and-open-questions.md) — what is not
   proven, and what was accepted.
4. [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) — what shipped, and
   every departure from the upstream template.

## Milestones

| Milestone | What it lands | Task |
|---|---|---|
| BH0 — the spec | the repository, its intent, CI, tooling and spec index; this doc set | BH-1 |
| BH1 — the marketing site on Workers | the template in `apps/web`, built by OpenNext into one Worker, with its unconnected sample mode; `tests/web` | BH-2 |
| BH2 — a baseline | the console card, the build document, the context pack and the baseline's tests, with a stand-in BaseHub for the connected build | BH-3 |
