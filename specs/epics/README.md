# Epics

Orun-style work programs. Each epic is a folder carrying `epic.yaml` (the
declaration the platform reads: slug, key prefix, milestones with exit
criteria and task keys) beside its doc set. The pull request that adds the
folder is the adoption; the merge creates the epic in the workspace.

| Epic | Cluster | Status | What it is |
|------|---------|--------|------------|
| [`basehub-marketing/`](./basehub-marketing/) | **BH** | In progress (BH1: the site on Workers) | BaseHub's marketing website template on Cloudflare Workers + Static Assets through OpenNext, deployable before a BaseHub repository exists, and an Orun baseline that instantiates it in one landing (BH2) |

As-built ≠ intent: what shipped lives in each epic's `IMPLEMENTATION-STATUS.md`.
