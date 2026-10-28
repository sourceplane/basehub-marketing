# basehub-marketing — where this repository stands

The entry page for anyone (or any agent) picking this repository up. It is
this repository's own state and does not ship to a site built from it; the
two pages that do are [operations.md](operations.md) and
[deployment.md](deployment.md).

## What it is

BaseHub's marketing website template on Cloudflare Workers + Static Assets
(`@opennextjs/cloudflare`) — pages composed in BaseHub from section blocks,
a blog, a changelog and feeds, read over BaseHub's GraphQL API and
pre-rendered by the build — packaged as an Orun baseline:
`orun new --blueprint repo-blueprint.yaml` builds a new site in its own
repository and takes it to live on stage and prod in one landing
(`01-product`), then records what went live (`02-docs`). It deploys before
its owner has a BaseHub repository: unconnected, the site serves bundled
sample content under a "connect BaseHub" bar. There is no infra component;
BaseHub stays the owner's SaaS.

## Release

| | |
|---|---|
| Latest tag | `baseline-v1` (BH2 — the baseline, one landing) |
| Proven live | No. Everything short of the platform is proven offline in Baseline CI, unconnected and against a stand-in BaseHub; a live bootstrap (risk BH-A) and a site connected to a real repository (risk BH-B) are still to come |
| Licence | Upstream carries none (risk BH-C): the registry row is unlisted |

## Where to read

| Question | Page |
|---|---|
| What shipped, and every departure from upstream | `specs/epics/basehub-marketing/IMPLEMENTATION-STATUS.md` |
| Why it is built this way | [decisions.md](decisions.md), then `specs/epics/basehub-marketing/design.md` |
| What could still go wrong | [open-risks.md](open-risks.md), then `specs/epics/basehub-marketing/risks-and-open-questions.md` |
| How to instantiate it | `BOOTSTRAP.md`, `docs/phases/` |
| What each component is | `apps/web/docs/`, `tests/web/docs/` (generated; `python3 tooling/catalog/gen-component-docs.py`) |

## Next

1. Bootstrap one site from `baseline-v1` against a workspace on Workers
   Paid, and record its timings (closes BH-A).
2. Connect a BaseHub repository made with "Use template" to it, see the
   samples give way, and try a form, the search and the toolbar through the
   Worker (closes BH-B).
3. Ask BaseHub to state the template's licence (closes BH-C).
