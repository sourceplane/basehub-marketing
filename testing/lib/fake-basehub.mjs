#!/usr/bin/env node
// A stand-in for BaseHub, for the e2e tier's CONNECTED build — so the site is
// proven to read a repository without ever calling the real service.
//
//   node testing/lib/fake-basehub.mjs <apps/web dir> <token> <log file>
//
// The SDK is pointed at it with BASEHUB_DEBUG_FORCED_URL=http://localhost:3001/graphql;
// for a forced URL on localhost:3001 the SDK resolves its ref at
// http://localhost:3000/api/git/resolve-ref, so both ports are served (and
// both must be free). Every request is logged, one JSON line each, so the
// tier can check the build asked this stand-in, with the token it was given.
//
// The repository it serves is the site's own sample content (bundled from
// apps/web/src/lib/basehub/sample with esbuild) made DIFFERENT, so a page
// built from it cannot be mistaken for the unconnected site: another site
// name, another first post, real-looking ingest and search keys, and one image
// on BaseHub's asset host. A query is GraphQL as the SDK sends it, parsed with
// the SDK's own graphql-js and executed over that tree by the resolver below —
// written apart from the unconnected site's projection, so the two do not
// share a mistake.
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [appDir, token, logFile] = process.argv.slice(2);
if (!appDir || !token || !logFile) {
  console.error("usage: fake-basehub.mjs <apps/web dir> <token> <log file>");
  process.exit(2);
}
const app = path.resolve(appDir);
const appRequire = createRequire(path.join(app, "package.json"));
const { parse, valueFromASTUntyped } = createRequire(appRequire.resolve("basehub"))("graphql");
const esbuild = createRequire(appRequire.resolve("wrangler"))("esbuild");

const STAND_IN = {
  siteName: "Stand-in Studio",
  firstPost: { title: "Served by the stand-in", slug: "served-by-the-stand-in" },
  heroTitle: "Read from a BaseHub repository",
  searchKey: "search.standin.invalid:standin-api-key:blogPost",
  ingestKey: "bshb_event_standin:e2e",
  image: "https://assets.basehub.com/standin/hero.png",
};

// ── the repository ──────────────────────────────────────────────────────────
const out = mkdtempSync(path.join(tmpdir(), "fake-basehub-"));
await esbuild.build({
  stdin: {
    contents: 'export { SAMPLE } from "./content";',
    resolveDir: path.join(app, "src/lib/basehub/sample"),
    loader: "ts",
  },
  tsconfig: path.join(app, "tsconfig.json"),
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: path.join(out, "sample.mjs"),
  logLevel: "error",
});
const { SAMPLE } = await import(pathToFileURL(path.join(out, "sample.mjs")).href);
rmSync(out, { recursive: true, force: true });

const repo = structuredClone(SAMPLE);
const sampleName = repo.site.settings.metadata.sitename;
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "ingestKey") node[k] = STAND_IN.ingestKey;
    else if (k === "_searchKey") node[k] = STAND_IN.searchKey;
    else if (typeof v === "string" && v.includes(sampleName)) node[k] = v.split(sampleName).join(STAND_IN.siteName);
    else walk(v);
  }
})(repo);
const first = repo.site.blog.posts.items[0];
first._title = STAND_IN.firstPost.title;
first._slug = STAND_IN.firstPost.slug;
first._sys = { ...first._sys, slug: STAND_IN.firstPost.slug, title: STAND_IN.firstPost.title };
const home = repo.site.pages.items.find((p) => p.pathname === "/");
const hero = home.sections.find((s) => s.__typename === "HeroComponent");
hero.title = STAND_IN.heroTitle;
repo.site.settings.logo.dark = { ...repo.site.settings.logo.dark, url: STAND_IN.image, rawUrl: STAND_IN.image };

// ── GraphQL, executed over the repository ──────────────────────────────────
// The SDK sends what BaseHub's API answers: named fragments per section type
// (`fragment f2 on HeroComponent { f2__alias__title: title }`, aliased so two
// members' fields cannot collide, and un-aliased by the SDK), arguments as
// literals or variables, collections filtered with `filter`, `orderBy`,
// `first` and `skip`. A type condition is a concrete type or one of the
// schema's abstract types, read from the template's committed
// basehub-types.d.ts (`export type BlockDocument = (A | B | …) & { __isUnion?: true }`).
const abstracts = new Map();
for (const m of readFileSync(path.join(app, "basehub-types.d.ts"), "utf8").matchAll(
  /^export type (\w+) = \(([^)]*)\) & \{ __isUnion\?: true \}/gm,
)) {
  abstracts.set(m[1], new Set(m[2].split("|").map((s) => s.trim())));
}
function typeMatches(cond, node) {
  const t = node.__typename;
  return t === undefined || t === cond || Boolean(abstracts.get(cond)?.has(t));
}
function fieldOf(item, key) {
  return key === "_sys_slug" ? (item._sys?.slug ?? item._slug) : item[key];
}
function matches(item, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (!cond || typeof cond !== "object") return fieldOf(item, key) === cond;
    return Object.entries(cond).every(([op, want]) => {
      const have = fieldOf(item, key);
      if (op === "eq") return have === want;
      if (op === "notEq") return have !== want;
      if (op === "in") return Array.isArray(want) && want.includes(have);
      throw new Error(`filter operator ${op} on ${key}: the stand-in knows eq, notEq and in`);
    });
  });
}
function collection(items, args) {
  let out = [...items];
  if (args.filter) out = out.filter((i) => matches(i, args.filter));
  if (args.orderBy) {
    const [field, dir] = String(args.orderBy).split("__");
    const sign = dir === "DESC" ? -1 : 1;
    out.sort((a, b) => (String(a[field] ?? "") < String(b[field] ?? "") ? -sign : String(a[field] ?? "") > String(b[field] ?? "") ? sign : 0));
  }
  if (typeof args.skip === "number") out = out.slice(args.skip);
  if (typeof args.first === "number") out = out.slice(0, args.first);
  return out;
}
function deepMerge(a, b) {
  if (!a || typeof a !== "object" || Array.isArray(a) || !b || typeof b !== "object" || Array.isArray(b)) return b;
  const m = { ...a };
  for (const [k, v] of Object.entries(b)) m[k] = k in m ? deepMerge(m[k], v) : v;
  return m;
}
function resolve(node, set, vars, frags) {
  if (node === undefined || node === null) return null;
  if (Array.isArray(node)) return node.map((n) => resolve(n, set, vars, frags));
  if (typeof node !== "object") return node;
  let out = {};
  for (const s of set.selections) {
    if (s.kind === "Field") {
      const name = s.name.value;
      const key = s.alias?.value ?? name;
      if (name === "__typename") {
        out[key] = node.__typename ?? null;
        continue;
      }
      const args = Object.fromEntries((s.arguments || []).map((a) => [a.name.value, valueFromASTUntyped(a.value, vars)]));
      let value = node[name];
      if (value && Array.isArray(value.items) && Object.keys(args).length) value = { ...value, items: collection(value.items, args) };
      const v = s.selectionSet ? resolve(value, s.selectionSet, vars, frags) : (value ?? null);
      out[key] = key in out ? deepMerge(out[key], v) : v;
    } else {
      const frag = s.kind === "FragmentSpread" ? frags[s.name.value] : s;
      if (frag.typeCondition && !typeMatches(frag.typeCondition.name.value, node)) continue;
      out = deepMerge(out, resolve(node, frag.selectionSet, vars, frags));
    }
  }
  return out;
}
function answer(body) {
  const doc = parse(body.query);
  const frags = Object.fromEntries(doc.definitions.filter((d) => d.kind === "FragmentDefinition").map((d) => [d.name.value, d]));
  const op = doc.definitions.find((d) => d.kind === "OperationDefinition");
  if (op.operation !== "query") throw new Error(`a ${op.operation}: the stand-in answers queries only`);
  return resolve(repo, op.selectionSet, body.variables || {}, frags);
}

// ── the two ports ───────────────────────────────────────────────────────────
function log(entry) {
  appendFileSync(logFile, JSON.stringify(entry) + "\n");
}
function serve(port, routes) {
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const route = routes[new URL(req.url, "http://localhost").pathname];
      const tokenOk = req.headers["x-basehub-token"] === token;
      const send = (status, payload) => {
        log({ port, method: req.method, path: req.url, status, tokenOk });
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      if (!route || req.method !== "POST") return send(404, { error: "the stand-in does not serve this" });
      if (!tokenOk) return send(401, { error: "wrong or missing x-basehub-token" });
      try {
        send(200, route(raw ? JSON.parse(raw) : {}));
      } catch (e) {
        log({ port, error: String(e?.message || e), query: raw.slice(0, 400) });
        send(200, { data: null, errors: [{ message: String(e?.message || e) }] });
      }
    });
  });
  server.listen(port); // every address, v4 and v6: the SDK fetches "localhost"
  return server;
}
serve(3000, {
  "/api/git/resolve-ref": () => ({ ref: "main", id: "standin-ref", repoHash: "standin", type: "branch", name: "main" }),
});
serve(3001, {
  "/graphql": (body) => ({ data: answer(body) }),
});
log({ ready: true, standIn: STAND_IN });
