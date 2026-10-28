# basehub-marketing

A marketing website whose pages — heroes, feature grids, pricing, testimonials,
FAQs, callouts and forms — its blog, its changelog, its navigation and its
theme are edited in [BaseHub](https://basehub.com) and read over BaseHub's
GraphQL API, running on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). It is
BaseHub's [marketing website template](https://github.com/basehub-ai/marketing-website-template),
ported to Workers.

## Live deployment

<!-- 02-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace and the secrets the site uses into
[ai/context/deployment.md](ai/context/deployment.md); how the site deploys
and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 02-docs:end -->

## Connecting BaseHub

The site deploys and serves before it has a BaseHub repository: until its
build is given a BaseHub read token it shows **sample content** bundled with
it — five pages, three blog posts and three changelog releases — under a bar
that says so. The newsletter and contact forms accept a submission and drop
it, and the blog has no search box. To make it read your content:

1. **Create the repository.** BaseHub's [Use template](https://basehub.com/basehub/marketing-website)
   copies the template's content model and its demo content into a new
   BaseHub repository of yours. Edit it there, and **commit** what you want
   live — the site reads the committed content.
2. **Give the build its token**, once per deployed environment: the
   repository's **read token** (the repository's Connect panel, or Settings →
   Tokens). `next build` reads every page from BaseHub and bakes the token
   into the server bundle (never into the browser's), so it is this
   repository's Orun secret, and stage and prod can each name their own
   repository or branch:

   ```bash
   orun secrets set BASEHUB_TOKEN --env stage   # prompts for the value
   orun secrets set BASEHUB_TOKEN --env prod
   ```

   Then **redeploy the site**: a secret is read when the site builds, and
   setting one builds nothing. Use **Deploy by hand** below, or change the
   stamp on the last line of `apps/web/component.yaml`
   (`# orun: redeploy …`) and merge; the sample content and the bar are gone
   from that deploy on, the forms send their submissions to BaseHub's events,
   the blog has BaseHub's search, and BaseHub's toolbar is on the page.

Every page is rendered by the build, as upstream's are, so **a commit in
BaseHub shows on the next deploy** — redeploy after publishing. A connected
build also carries BaseHub's toolbar, as upstream does; its draft-mode
switch is not exercised by the site's tests on Workers, so check it before
your editors rely on it.

## What is here

| Surface | Where |
|---|---|
| Pages (`[[...slug]]`), the blog, the changelog, feeds, sitemap, robots, `/api/health` | `apps/web/src/app` |
| The page sections | `apps/web/src/app/_sections` |
| BaseHub's client, `<Pump>`, events and images — or the sample content when unconnected | `apps/web/src/lib/basehub` |
| The sample content and its images | `apps/web/src/lib/basehub/sample`, `apps/web/public/sample` |
| BaseHub's schema types (committed) | `apps/web/basehub-types.d.ts` |
| The site's name | `apps/web/src/lib/site.ts` |
| The fonts (Geist, self-hosted) | `apps/web/src/app/fonts` |
| Workers build and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `component.yaml` |
| Tests | `tests/web` (vitest) |

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build            # next build + opennextjs-cloudflare build → apps/web/.open-next
pnpm --filter @app/web preview   # wrangler dev over the built Worker
```

That needs no BaseHub repository, and is what to run before you push: a pull
request builds the site but does not lint or run its tests. With one:

```bash
cd apps/web
cp .env.example .env.local        # BASEHUB_TOKEN=<the repository's read token>
cd ../..
pnpm --filter @app/web dev        # http://localhost:3000
```

When you change the content model in BaseHub, regenerate the types the code
is checked against and commit them:

```bash
BASEHUB_TOKEN=<token> pnpm --filter @app/web basehub:types
```

| Variable | Read | What it does |
|---|---|---|
| `BASEHUB_TOKEN` | build time | The BaseHub repository's read token. Deployed builds take it from the `BASEHUB_TOKEN` secret of their environment. Unset, the site is unconnected: sample content under a notice. |
| `NEXT_PUBLIC_SITE_URL` | build time | The site's origin, for the sitemap, robots, feeds and Open Graph links. Deployed builds set it per environment. |

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. The site builds once per
environment, with that environment's BaseHub token and origin, and deploys
— to `stage`, then to `prod` once stage has converged on the same commit;
`dev` only verifies. The Worker is `basehub-marketing-web-<env>` on your
account's workers.dev subdomain, and every deploy is smoke-tested over HTTP:
the home page must render with its link to the blog and `/api/health` must
answer. A pull request runs the same pipeline's verify lanes: the site built
and dry-deployed for each environment, with nothing deployed. They do not
lint or run the tests, so run `pnpm typecheck`, `pnpm lint` and `pnpm test`
before you push. (A push to `main` builds, deploys and smoke-tests.)

The Worker is a little over 3 MiB gzipped — BaseHub's code-block renderer
carries every language grammar — so the Cloudflare account needs the
**Workers Paid** plan (Free allows 3 MiB).

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The
Cloudflare token and account id are brokered per run from the workspace's
Cloudflare connection; nothing provider-shaped is stored in the repository
or in GitHub.

**Deploy by hand.** Orunbase's **Deploy** button on a component, or **Run
workflow** on the CI workflow in GitHub's Actions tab (on `main`), runs
`ci.yml` for the environment and components you pick, and each one deploys
exactly as a merge would deploy it. Leave the component blank to redeploy
every component in that environment, with nothing changed: after rotating a
secret, or publishing in BaseHub, say. A component with nothing to run in
that environment (a test suite in `prod`) is left out with a notice.

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain:

1. Add the domain to the Cloudflare account the site deploys into, and attach
   it to the Worker (dashboard → Workers & Pages →
   `basehub-marketing-web-prod` → Settings → Domains & Routes → Add →
   Custom domain). Do the same for stage with a subdomain if you want one.
2. Record the environment's public origin in `intent.yaml`: the deploy
   builds the sitemap, robots, feeds and Open Graph links for it (until then
   they name the workers.dev URL), and the deployment record probes it
   beside the workers.dev URL:

   ```yaml
   environments:
     prod:
       env:
         SITE_URL: https://basehub-marketing.example.com
   ```

   The site was born with the reserved placeholder
   `basehub-marketing.example.com` where its domain goes: that example and
   `BASE_DOMAIN` under each environment (dev, stage and prod) in
   `intent.yaml`. Replace it with your domain in the same change, and land it
   with a change under `apps/web` so the merge rebuilds the site.

## Credits

The site is BaseHub's [marketing website template](https://github.com/basehub-ai/marketing-website-template).
That repository carries no licence: it has no LICENSE file, its
`package.json` declares none and GitHub records none. The sample content and
its images were written for this site's first deploy; replace them by
connecting BaseHub. Geist is © Vercel, under the SIL Open Font License 1.1
(`apps/web/src/app/fonts/Geist-OFL.txt`).
