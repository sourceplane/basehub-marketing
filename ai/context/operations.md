# basehub-marketing — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, the secrets it uses) live in
[deployment.md](deployment.md), rendered from probed reality by the
bootstrap's `02-docs` phase; this file is the contract that stays true
between deployments. It is written to give an agent with repository read
access enough context to reason about and operate the site without any
other source.

## What this system is

A marketing website, blog and changelog whose content lives in
[BaseHub](https://basehub.com), served from Cloudflare, expressed as an Orun
component-native desired-state repo.

- **`apps/web`** — Next.js built by `@opennextjs/cloudflare` into one Worker
  plus Static Assets. Every page — the BaseHub pages (`/`, `/features`, …),
  `/blog`, `/changelog`, their posts and releases, the RSS feeds, the
  sitemap and robots — is rendered by the BUILD from BaseHub's GraphQL API
  and served from the Worker's static-assets cache. `/api/health` answers at
  request time and says which content the build read.
- **`tests/web`** — vitest over the site's name, the sample content's
  projection onto a query, its links and images, and the connected and
  unconnected switch. No lane lints or runs the tests: a pull request builds
  and dry-deploys the site, so run `pnpm typecheck && pnpm lint && pnpm
  test` before you push.
- **`tooling/*`** — shared TypeScript and ESLint configuration, and the
  wrangler renderer for a deployable that comes to take wiring.

There is no infrastructure component: BaseHub is a hosted service the
site reads over HTTPS, not something this repository provisions.

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and dry-deploy, nothing deploys.

## BaseHub: connected, or sample content

The site reads ONE BaseHub repository, fixed at build time (`next build`
reads every page with its read token, and inlines the token into the server
bundle, never the browser's). Until a build has a `BASEHUB_TOKEN` it is
**unconnected**: every query is answered from the sample content in
`apps/web/src/lib/basehub/sample`, every page carries a "connect BaseHub"
bar (`data-basehub="not-connected"`), the forms accept and drop their
submissions, the blog has no search box, and `/api/health` answers
`"content":"sample"`. Nothing fails: an unconnected site deploys, passes its
smoke test and serves.

To connect it:

```bash
# 0. once: BaseHub's "Use template" (https://basehub.com/basehub/marketing-website)
#    creates a repository with the template's content model and demo content.

# 1. per deployed environment: the repository's read token (the next build reads it)
orun secrets set BASEHUB_TOKEN --env stage    # prompts for the value
# …and the same with --env prod

# 2. redeploy apps/web: the token is read when it BUILDS, and setting a
#    secret builds nothing. Deploy by hand, or change the stamp on the last
#    line of apps/web/component.yaml (`# orun: redeploy <reason> <stamp>`) and merge.
```

The token is read best-effort (`optionalSecretEnv` in
`apps/web/component.yaml`): a key nobody has stored is skipped, never a
failed lane. A wrong token fails the build (BaseHub refuses the query), so
the lane goes red and the deployed site stays as it was.

## Identity and tenancy

Every remote operation runs against ONE Orun workspace, declared in
`intent.yaml` under `execution.state.workspace` — committed, enforced, and
what CI uses. Do not remove it; headless credentials depend on it. If it
reads `ws_SET_ME`, the bootstrap had no workspace to write: set the real one
before anything else.

## How deployment works

1. Merge (or push) to `main`.
2. CI (`.github/workflows/ci.yml`) runs `orun plan --changed` — only
   components whose files changed are planned — then runs each planned lane
   with `orun run --remote-state`, authenticated by GitHub OIDC (the
   exchange resolves this repository's linked workspace server-side).
3. `apps/web` checks its committed `wrangler.jsonc` is there, builds once per
   environment with that environment's BaseHub token (if any) and origin,
   `wrangler deploy` ships `basehub-marketing-web-<env>`, and a smoke test
   fetches `/` and requires its link to the blog, then requires `/api/health`
   to answer `"ok":true` — proof the Worker's server code answers.
4. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
5. **The convergence run is the deployment.** A green run means every
   planned lane passed. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

On a pull request nothing deploys: the site builds and dry-deploys.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- Published content needs a deploy: every page is rendered by the build, so
  a commit in BaseHub shows once `apps/web` is redeployed (Deploy by hand,
  below).
- A change to `intent.yaml`'s `environments`, or to an Orun secret, maps to
  no component and redeploys nothing on its own. Land it with a change under
  `apps/web`.

## Secrets model

- **Brokered provider secrets**: `CLOUDFLARE_API_TOKEN` (the
  `workers-deploy` scope) and `CLOUDFLARE_ACCOUNT_ID` — pointers minted per
  run from the workspace's Cloudflare connection. No long-lived values at
  rest; nothing to rotate by hand.
- **The BaseHub repository**: `BASEHUB_TOKEN` on `stage` and `prod`, stored
  by the owner, read by the build and inlined into the server bundle. A
  read token; kept as a secret so each environment can name its own
  repository or branch.
- Inspect by NAME only: `orun secrets list --org <ws> --env stage|prod`. No
  tooling in this repository prints a secret value, and no document in
  `ai/context/` may contain one.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md);
# {"ok":true,"content":"sample"} until BaseHub is connected, then "basehub"
curl -s https://basehub-marketing-web-stage.your-workers-subdomain.workers.dev/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://basehub-marketing-web-prod.your-workers-subdomain.workers.dev/
curl -s -o /dev/null -w '%{http_code}\n' https://basehub-marketing-web-prod.your-workers-subdomain.workers.dev/blog

# workspace readiness
orun secrets list --org <ws> --env stage && orun secrets list --org <ws> --env prod
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| connect a BaseHub repository | "BaseHub: connected, or sample content" above |
| write, edit, publish | in BaseHub's web app, then commit there; the commit is live after the next deploy of `apps/web` |
| change the site's code | edit `apps/web` (its name: `apps/web/src/lib/site.ts`), merge |
| change the content model | in BaseHub, then `BASEHUB_TOKEN=<token> pnpm --filter @app/web basehub:types` and commit `apps/web/basehub-types.d.ts`; a new section type also needs its component in `apps/web/src/app/_sections` and a case in the page's switch |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| deploy by hand | Orunbase's Deploy button, or `gh workflow run ci.yml --ref main -f environment=<env> [-f component=<a,b>]` — the named components (blank: every one) run in that environment as a merge runs them; started off `main` it is refused |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| serve a custom domain | attach it to the Worker in Cloudflare and set the environment's `SITE_URL` in `intent.yaml` (README, "Custom domain"), replacing the placeholder `basehub-marketing.example.com` in its `BASE_DOMAIN` (dev, stage and prod) in the same change |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `02-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 02-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

Structural changes follow the same contract that deployed the site: add a
component under `apps/`, `infra/` or `packages/` with a `component.yaml`,
land it as a pull request, and the convergence run deploys it. A component
under `infra/` whose wiring the Worker reads is declared in `apps/web`'s
`dependsOn` (enforced on `main`), so it is applied first.
