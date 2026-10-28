# basehub-marketing — decisions

The choices that shape this repository, one line each, with where the full
reasoning lives. Superseded decisions stay listed, marked, so the history
reads in order.

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | OpenNext on Workers + Static Assets (`cloudflare-workers-assets-turbo`), the static-assets incremental cache; no R2 or Durable Object cache | Every page is pre-rendered; nothing in the Worker is revalidated | `specs/epics/basehub-marketing/design.md` §2 |
| 2 | Pages stay `force-static` with `generateStaticParams`, as upstream; a commit in BaseHub needs a redeploy | The template is built that way, and no page view reaches BaseHub | design.md §7, risk BH-D |
| 3 | `next build` without the `basehub` CLI; the committed `basehub-types.d.ts` are the types | The CLI fails with no token, and a fresh product has none | design.md §2 |
| 4 | The unconnected site: with no `BASEHUB_TOKEN` the SDK's client and `<Pump>` are answered from sample content projected onto the same selection — nothing throws | The platform brokers Cloudflare, not BaseHub, so a bootstrap deploys before the owner has a repository (cms-sanity's pattern) | design.md §3 |
| 5 | `BASEHUB_TOKEN` is `optionalSecretEnv`, read at build and inlined into the server bundle | A required ref fails the lane before its first step on a fresh product; request-time routes must agree with the build | risk BH-E |
| 6 | Unconnected, no toolbar, no search box, and form events dropped | Each needs a repository | design.md §3 |
| 7 | Geist self-hosted through `next/font/local` | Google Fonts is unreachable from the build on GitHub's runners | IMPLEMENTATION-STATUS #8 |
| 8 | Every shiki grammar kept: the Worker needs Workers Paid | A code block's language is the editor's choice | risk BH-F |
| 9 | Next 16.3.8 | OpenNext supports 16.3, not 16.4 | risk BH-G |
| 10 | Two phases, one landing (`01-product`, `02-docs`), no infra component | A landing has a fixed cost (cirrus-baseline since baseline-v22); the site provisions nothing | design.md §5 |
| 11 | `ci.yml` plans nothing while `intent.yaml` names `ws_CHANGE_ME`; stack-tectonic 0.19.0, not 0.20.0 | A bootstrap cannot set a repository variable; Turbopack refuses 0.20.0's out-of-tree `node_modules` | risk BH-I |
| 12 | The connected build is tested against a stand-in BaseHub on localhost, never the real service | A test cannot hold a real token, and must not depend on a SaaS | design.md §5 |
| 13 | Component docs are generated from the manifests and checked in CI | A hand-written copy of the dependency graph and bindings drifts silently | `tooling/catalog/gen-component-docs.py` |
| 14 | The workers.dev subdomain is read from the Cloudflare connection; the console asks for no domain, and an empty `productdomain` brands the placeholder `<reponame>.example.com` | One right answer for the subdomain; a domain is an owner's step after the bootstrap | `blueprint.yaml`, `tooling/rebrand/rebrand.mjs` |
