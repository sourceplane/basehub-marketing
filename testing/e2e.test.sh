#!/usr/bin/env bash
# TIER 2 — the site a bootstrap produces builds, deploys (dry) and serves,
# with NO BaseHub repository behind it.
#
# placement.test.sh proves the tree a bootstrap ends with is the right tree.
# This proves it WORKS, by doing to it what its own pipelines will — on the
# day it is built, when its owner has not connected a BaseHub repository yet:
#
#   1. at the 01-product landing (the commit its one pull request merges), the
#      landing's own checks — install with the lockfile the product ships,
#      render fixtures and check the committed config is the render,
#      typecheck, lint, test, build. The bootstrap's landings are checked in
#      the box with `orun validate` and `orun plan` alone (`checks: local`;
#      their PR's CI on an `orun/BASE-…` branch is `plan` alone), and a
#      product's later pull requests build and dry-deploy it through ci.yml's
#      lanes, so THIS is where a product those steps refuse is caught: before
#      the tag, not after a build has merged it. Then the same at the 02-docs
#      landing, the finished site;
#   2. the stage lane's own steps, read out of `orun plan` in the product for
#      a pull request (the verify profile: the deploy profile has no dry run)
#      — EVERY `run:` step of the job, in order, exactly as planned: the
#      install, `verify-app-structure` (the committed `package.json` and
#      `wrangler.jsonc`, checked BEFORE any build), `build-app` (TypeGen,
#      `next build` on Turbopack, the OpenNext bundle), `verify-build-output`
#      and `deploy-dry-run` (`wrangler deploy --dry-run --name
#      <reponame>-web-stage`). They run IN THE TREE THE RUNNER STAGES for the
#      job (testing/lib/stage-job.py), with no build output in it and the
#      dependency layout the pinned composition produces: if its install step
#      is `scope: lane`, the top-level node_modules is a symlink to the source
#      checkout's (which Turbopack refuses); if not, the job's own install
#      step runs inside the staged tree. The job's BaseHub ref is optional,
#      and a fresh product has stored none, so the lane runs with no token —
#      as here;
#   3. serve the built Worker with `wrangler dev` and run the component's OWN
#      `smokeCommand` against it, verbatim and then inside the deploy
#      profile's planned `smoke` step (its retry loop and all — only its
#      workers.dev URL swapped for the local one) — the check the real deploy
#      ends with; then read every route the site promises: the five sample
#      pages, the blog and its three posts, the changelog and its three
#      releases under the "connect BaseHub" bar and the site's own name, the
#      feeds, sitemap and robots built for the stage origin, the health check
#      saying "sample", the 404s, the static assets and the self-hosted fonts;
#   4. CONNECTED: the same lane's build step again, now with a BASEHUB_TOKEN
#      and the SDK pointed at a stand-in BaseHub (testing/lib/fake-basehub.mjs
#      on localhost:3001 and :3000 — never the real service), then served:
#      every page is the stand-in repository's — its site name, hero, first
#      post and image host — with no bar, the blog's search box and the
#      health check saying "basehub"; the stand-in was asked, with the token;
#      and the token is in no file a browser can fetch.
#
# What it cannot do is the platform's half: create the repository, mint the
# brokered Cloudflare token, deploy for real and probe workers.dev — nor
# BaseHub's own: a site reading a real repository needs one. That is a
# bootstrap against a workspace (BOOTSTRAP.md); everything short of it is
# here.
#
# Needs: orun, node, pnpm, python3 (+PyYAML), git, curl, setsid, and the
# network for `pnpm install` (or a warm store), and ports 3000 and 3001 free
# for the stand-in BaseHub. Several minutes: three installs and four Next.js
# builds.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
# shellcheck source=lib/bootstrap.sh
source "$here/lib/bootstrap.sh"

for bin in orun node pnpm python3 git curl setsid; do
  command -v "$bin" >/dev/null || { echo "e2e.test.sh needs $bin on PATH" >&2; exit 1; }
done

scratch="$(mktemp -d)"
dev_pid=""
fake_pid=""
# wrangler dev runs under pnpm, node and two workerd processes; a TERM to the
# first does not reach the rest, and waiting on it then never returns. So it is
# started as its own process group (setsid) and the whole group is stopped.
stop_dev() {
  if [ -n "$dev_pid" ]; then
    kill -TERM -- "-$dev_pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 -- "-$dev_pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL -- "-$dev_pid" 2>/dev/null || true
    dev_pid=""
  fi
}
cleanup() {
  stop_dev
  [ -z "$fake_pid" ] || kill "$fake_pid" 2>/dev/null || true
  rm -rf "$scratch"
}
trap cleanup EXIT
values="$here/fixtures/acme.json"
repo="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['reponame'])" "$values")"
sub="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['subdomain'])" "$values")"
export CI=1 WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1
# NO BASEHUB TOKEN, whatever the caller's shell holds: this is the site its
# owner gets before connecting a repository. (Step 4 sets one, for its build
# only, against the stand-in.)
unset BASEHUB_TOKEN BASEHUB_DEBUG_FORCED_URL BASEHUB_REF BASEHUB_DRAFT BASEHUB_URL
free_port() { python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1]);s.close()"; }

# The landing's own checks, step for step, run here at once on the whole
# tree. A pull request in the product builds and dry-deploys the site
# through ci.yml's lanes; the lint and the tests run here, and by hand before
# a push.
LANDING_CHECKS=(
  "pnpm install --frozen-lockfile"
  "pnpm run wire:fixture"
  "git diff --exit-code"
  "pnpm typecheck"
  "pnpm lint"
  "pnpm test"
  "pnpm build"
)
checks() { # DIR LOG
  local dir="$1" log="$2" cmd
  for cmd in "${LANDING_CHECKS[@]}"; do
    echo "   \$ $cmd" | tee -a "$log"
    if ! (cd "$dir" && bash -c "$cmd") >> "$log" 2>&1; then
      echo "FAIL: \`$cmd\` failed in $dir" >&2; tail -40 "$log" >&2; return 1
    fi
  done
}

echo "── the offline bootstrap (testing/lib/bootstrap.sh)"
tree="$scratch/$repo"
bootstrap_offline "$root" "$tree" "$values" "$scratch/logs" > "$scratch/bootstrap.log" 2>&1 || {
  echo "FAIL: the offline bootstrap stopped" >&2; tail -40 "$scratch/bootstrap.log" >&2; exit 1; }
s00="$(git -C "$tree" rev-parse HEAD~2)"; s01="$(git -C "$tree" rev-parse HEAD~1)"
echo "   2 phases placed and landed on orun's Initial commit"

# ── 1. each landing's own checks ───────────────────────────────────────────
echo "── 01-product's landing: install, the fixture render, typecheck, lint, test, build"
git -C "$tree" worktree add -q "$scratch/at-01" "$s01"
checks "$scratch/at-01" "$scratch/checks-01.log"
# Its tree is not needed again, and the disk is shared.
git -C "$tree" worktree remove --force "$scratch/at-01"

echo "── 02-docs's landing (the finished site): the same checks"
checks "$tree" "$scratch/checks-site.log"
grep -q '(Turbopack)' "$scratch/checks-site.log" \
  || { echo "FAIL: the landing's build did not run on Turbopack" >&2; exit 1; }

# ── 2. the stage lane, as a pull request plans it ──────────────────────────
echo "── the stage lane: every run step the PR plan gives web@stage, in a staged job tree"
(cd "$tree" && orun plan --intent intent.yaml --trigger github-pull-request --changed \
   --base "$s00" --head "$s01" --env stage --output "$scratch/plan-pr.json") > "$scratch/plan-pr.log" 2>&1 \
  || { echo "FAIL: orun plan (pull request)" >&2; tail -15 "$scratch/plan-pr.log" >&2; exit 1; }
python3 - "$scratch/plan-pr.json" "$scratch/steps" "$tree" "$values" <<'PY'
import json, pathlib, sys
import yaml
plan = json.load(open(sys.argv[1]))
out = pathlib.Path(sys.argv[2]); out.mkdir()
tree, values = pathlib.Path(sys.argv[3]), json.load(open(sys.argv[4]))
repo, ws = values["reponame"], values["orunWorkspace"]
job = next(j for j in plan["jobs"] if j["component"] == "web" and j["environment"] == "stage")
params = yaml.safe_load((tree / "apps/web/component.yaml").read_text())["spec"]["parameters"]
order, uses = [], []
for s in job["steps"]:
    if "use" in s:
        uses.append(f"{s['id']}\t{s['use']}\t{json.dumps(s.get('with') or {})}")
        continue
    order.append(s["id"])
    (out / f"{s['id']}.sh").write_text(s.get("run") or "")
    (out / f"{s['id']}.wd").write_text(s.get("working-directory") or ".")
    if s.get("scope"):
        (out / f"{s['id']}.scope").write_text(s["scope"])
(out / "order").write_text("\n".join(order) + "\n")
(out / "uses").write_text("\n".join(uses) + "\n")
(out / "path").write_text(job.get("path") or "apps/web")
(out / "profile").write_text(job["profile"])
(out / "node").write_text(params["nodeVersion"])
(out / "pnpm").write_text(params["pnpmVersion"])
for k, v in (job.get("env") or {}).items():
    (out / "env").open("a").write(f"export {k}={json.dumps(v)}\n")
# What the platform resolves into the job before its first step. The
# BaseHub repository's refs are OPTIONAL: on a product nobody has connected,
# nothing is stored under them, so nothing is exported — which is what this
# lane replays.
refs = {r["asEnv"]: r for r in job.get("secretRefs") or []}
for key in ("BASEHUB_TOKEN",):
    r = refs.get(key)
    if not r or r.get("optional") is not True or f"/{repo}/stage/" not in r.get("ref", ""):
        sys.exit(f"FAIL: the stage lane resolves {key} as {r} — want an optional ref to the product's stage secret")
required = sorted(k for k, r in refs.items() if not r.get("optional"))
if required:
    sys.exit(f"FAIL: the verify lane requires secrets {required}; a pull request's lane needs none")
PY
order="$(tr '\n' ' ' < "$scratch/steps/order")"
echo "   $(cat "$scratch/steps/profile"): $order"
for need in install-workspace-dependencies verify-app-structure build-app verify-build-output deploy-dry-run; do
  grep -qx "$need" "$scratch/steps/order" || { echo "FAIL: the stage lane plans no $need step" >&2; exit 1; }
done
[ "$(grep -n -x verify-app-structure "$scratch/steps/order" | cut -d: -f1)" -lt "$(grep -n -x build-app "$scratch/steps/order" | cut -d: -f1)" ] \
  || { echo "FAIL: the structure check is planned after the build" >&2; exit 1; }
# The `use:` steps set up the runner's toolchain; here it is this machine's,
# so it must be the one the component asks for.
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" = "$(cat "$scratch/steps/node")" ] || { echo "FAIL: node $node_major here, the lane sets up $(cat "$scratch/steps/node")" >&2; exit 1; }
[ "$(pnpm --version)" = "$(cat "$scratch/steps/pnpm")" ] || { echo "FAIL: pnpm $(pnpm --version) here, the lane sets up $(cat "$scratch/steps/pnpm")" >&2; exit 1; }
echo "   setup-node $node_major and setup-pnpm $(pnpm --version) stand in for the lane's \`use:\` steps"
echo "   the BaseHub token's ref is optional and unstored: the lane builds with none"

# The job's private tree, staged as orun stages it, from a source checkout
# with no build output (a CI checkout has none, so step 1's is removed rather
# than copied in) and the dependencies the pinned composition says: a
# lane-scoped install ran once in the source tree (step 1 ran the same
# command) and is linked in, or the job installs its own.
rm -rf "$tree/apps/web/.next" "$tree/apps/web/.open-next" "$tree/apps/web/.wrangler" "$tree/tests/web/coverage"
work="$tree/.orun/runs/e2e/web.stage.verify-deploy/work"
install_scope="$(cat "$scratch/steps/install-workspace-dependencies.scope" 2>/dev/null || echo job)"
if [ "$install_scope" = lane ]; then
  python3 "$here/lib/stage-job.py" "$tree" "$work" --shared-deps
  [ -L "$work/node_modules" ] || { echo "FAIL: the staged tree's node_modules is not the lane's symlink" >&2; exit 1; }
else
  python3 "$here/lib/stage-job.py" "$tree" "$work"
  [ ! -e "$work/node_modules" ] || { echo "FAIL: the staged tree carries node_modules it should install" >&2; exit 1; }
fi
for built in apps/web/.next apps/web/.open-next apps/web/.wrangler; do
  [ ! -e "$work/$built" ] || { echo "FAIL: the staged tree carries build output ($built)" >&2; exit 1; }
done
echo "   staged: $(realpath --relative-to="$tree" "$work"); install scope: $install_scope; no build output"

while IFS= read -r step; do
  [ -n "$step" ] || continue
  if [ "$step" = install-workspace-dependencies ] && [ "$install_scope" = lane ]; then
    echo "   · $step (lane-scoped: ran once in the source tree)"; continue
  fi
  echo "   ▸ $step"
  # The runner's per-job environment: the job's env (intent environment
  # `env:`) and ORUN_ENVIRONMENT; the step runs in the component's directory.
  if ! (cd "$work/$(cat "$scratch/steps/path")/$(cat "$scratch/steps/$step.wd")" && \
        { [ -f "$scratch/steps/env" ] && source "$scratch/steps/env"; true; } && \
        export ORUN_ENVIRONMENT=stage && bash -e "$scratch/steps/$step.sh") > "$scratch/$step.log" 2>&1; then
    echo "FAIL: the stage lane's $step step" >&2; tail -40 "$scratch/$step.log" >&2; exit 1
  fi
done < "$scratch/steps/order"
[ "$install_scope" = lane ] || { [ -d "$work/node_modules" ] && [ ! -L "$work/node_modules" ]; } \
  || { echo "FAIL: the job's install did not land inside its own tree" >&2; exit 1; }
# The build this site is verified with: Turbopack (a webpack build would get
# past an out-of-tree symlink and is not the build that deploys).
grep -q '(Turbopack)' "$scratch/build-app.log" \
  || { echo "FAIL: the staged build did not run on Turbopack" >&2; grep -m3 'Next.js' "$scratch/build-app.log" >&2; exit 1; }
grep -q -- "--name \"\${EFFECTIVE_WORKER_NAME}\"" "$scratch/steps/deploy-dry-run.sh" && grep -q "$repo-web-stage" "$scratch/steps/deploy-dry-run.sh" \
  || { echo "FAIL: the dry run does not name the Worker $repo-web-stage" >&2; exit 1; }
grep -q 'Total Upload' "$scratch/deploy-dry-run.log" \
  || { echo "FAIL: the dry run bundled nothing" >&2; tail -20 "$scratch/deploy-dry-run.log" >&2; exit 1; }
echo "   the staged build ran on Turbopack; the dry run bundled $repo-web-stage ($(grep -m1 -o 'Total Upload: .*' "$scratch/deploy-dry-run.log"))"

# ── 3. serve it, and smoke it as the deploy does ───────────────────────────
echo "── wrangler dev over the staged Worker, no BaseHub repository"
# serve_worker [wrangler dev args…]: the staged Worker on a free port, as its
# own process group; sets $url.
serve_worker() {
  local port iport
  port="$(free_port)"; iport="$(free_port)"
  # setsid without its own fork: the subshell is not a group leader, so the
  # pid recorded IS the new process group's.
  (cd "$work/apps/web" && exec setsid pnpm exec wrangler dev --config wrangler.jsonc --name "$repo-web-stage" \
     --ip 127.0.0.1 --port "$port" --inspector-port "$iport" --show-interactive-dev-session=false "$@") \
     > "$scratch/dev.log" 2>&1 < /dev/null &
  dev_pid=$!
  url="http://127.0.0.1:$port"
  for _ in $(seq 1 120); do
    curl -s -o /dev/null "$url/robots.txt" && break
    kill -0 "$dev_pid" 2>/dev/null || { echo "FAIL: wrangler dev exited" >&2; tail -30 "$scratch/dev.log" >&2; exit 1; }
    sleep 1
  done
  curl -s -o /dev/null "$url/robots.txt" || { echo "FAIL: wrangler dev never answered" >&2; tail -30 "$scratch/dev.log" >&2; exit 1; }
}
serve_worker

smoke="$(python3 -c "import yaml,sys;print(yaml.safe_load(open(sys.argv[1]))['spec']['parameters']['smokeCommand'])" "$tree/apps/web/component.yaml")"
echo "   ▸ the component's own smokeCommand, verbatim, DEPLOYED_URL=$url"
DEPLOYED_URL="$url" bash -c "$smoke" || { echo "FAIL: the deploy's smoke refused the site" >&2; exit 1; }
if DEPLOYED_URL="$url/no-such-site" bash -c "$smoke" 2>/dev/null; then
  echo "FAIL: the smoke passed against a path that is not the site — it checks nothing" >&2; exit 1
fi
echo "   ▸ …and it refuses what is not the site"

(cd "$tree" && orun plan --intent intent.yaml --trigger github-push-main --changed \
   --base "$s00" --head "$s01" --env stage --output "$scratch/plan-push.json") > "$scratch/plan-push.log" 2>&1 \
  || { echo "FAIL: orun plan (push to main)" >&2; tail -15 "$scratch/plan-push.log" >&2; exit 1; }
python3 - "$scratch/plan-push.json" "$scratch/smoke-step.sh" "https://$repo-web-stage.$sub.workers.dev" <<'PY'
import json, sys
plan, out, origin = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
job = next(j for j in plan["jobs"] if j["component"] == "web" and j["environment"] == "stage")
assert job["profile"].endswith(".deploy"), job["profile"]
run = next(s for s in job["steps"] if s["id"] == "smoke")["run"]
# The one thing offline cannot reach is workers.dev: the step derives its URL
# from the Worker's name and the account's subdomain, so that line — and only
# that line — is pointed at the local Worker, after checking it is this site's.
line = 'export DEPLOYED_URL="https://${EFFECTIVE_WORKER_NAME}.${WORKERS_DEV_SUBDOMAIN}.workers.dev"'
if line not in run or 'EFFECTIVE_WORKER_NAME="' + origin.split("//")[1].split(".")[0] + '"' not in run:
    sys.exit(f"FAIL: the planned smoke step does not derive {origin}:\n{run}")
open(out, "w").write(run.replace(line, 'export DEPLOYED_URL="${E2E_LOCAL_URL}"'))
PY
echo "   ▸ the deploy profile's planned smoke step (its retry loop around the same command), on the local Worker"
(E2E_LOCAL_URL="$url" bash "$scratch/smoke-step.sh") > "$scratch/smoke-step.log" 2>&1 \
  || { echo "FAIL: the planned smoke step refused the site" >&2; tail -20 "$scratch/smoke-step.log" >&2; exit 1; }

echo "   ▸ every route the site promises"
python3 - "$url" "$values" "https://$repo-web-stage.$sub.workers.dev" <<'PY'
import html, json, re, sys, urllib.error, urllib.request
base, values, origin = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
name, repo, org = values["productname"], values["reponame"], values["githuborg"]
problems = []
def bad(m): problems.append(m)
def get(path):
    try:
        with urllib.request.urlopen(base + path, timeout=60) as r:
            return r.status, r.headers.get("content-type", ""), r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type", ""), e.read()
def text(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()
def title(page):
    m = re.search(r"<title>(.*?)</title>", page, re.S)
    return html.unescape(m.group(1)) if m else None
def h1(page):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    return text(m.group(1)) if m else None
NOTICE = 'data-basehub="not-connected"'
POSTS = ("shipping-a-launch-page", "writing-release-notes", "measuring-what-a-page-does")
RELEASES = ("dark-mode", "pricing-comparison-table", "rss-feeds")

# The home page: the sample content under the site's own name and the bar.
s, ctype, body = get("/")
page = body.decode()
if s != 200 or not ctype.startswith("text/html"):
    bad(f"/ answered {s} {ctype}")
if title(page) != f"Home | {name}":
    bad(f"the home page's <title> is {title(page)!r}, not {'Home | ' + name!r}")
if h1(page) != "Launch the site your product deserves":
    bad(f"the home page's heading is {h1(page)!r}, not the sample hero's")
if NOTICE not in page or "BASEHUB_TOKEN" not in page:
    bad("the home page does not say the site is unconnected, or how to connect it")
if 'href="/blog"' not in page:
    bad("the home page does not link the blog")
if f'href="https://github.com/{org}/{repo}"' not in page:
    bad(f"the home page does not link the site's own repository github.com/{org}/{repo}")
for residue in ("Marketing Website", "sourceplane/basehub-marketing"):
    if residue in html.unescape(page):
        bad(f"the home page still carries the baseline's {residue!r}")

# The other sample pages, each under the bar.
for path, want in (("/features", "Features"), ("/pricing", "Pricing"), ("/contact", "Contact"), ("/about", "About")):
    s, _, body = get(path)
    p = body.decode()
    if s != 200 or NOTICE not in p or title(p) != f"{want} | {name}":
        bad(f"{path} answered {s}, <title> {title(p)!r}, bar {NOTICE in p}")

# The blog: its three posts, no search box (search needs a repository).
s, _, body = get("/blog")
blog = body.decode()
if s != 200 or title(blog) != f"Blog | {name}":
    bad(f"/blog answered {s}, <title> {title(blog)!r}")
links = set(re.findall(r'href="/blog/([^"/]+)"', blog)) - {"rss.xml"}
if links != set(POSTS):
    bad(f"/blog links the posts {sorted(links)}, not the samples {sorted(POSTS)}")
if 'placeholder="Search"' in blog:
    bad("/blog shows a search box, which an unconnected site has no index for")
shiki = False
for slug in POSTS:
    s, _, body = get(f"/blog/{slug}")
    p = body.decode()
    if s != 200 or NOTICE not in p or not h1(p) or title(p) != f"{h1(p)} | {name}":
        bad(f"/blog/{slug} answered {s}, heading {h1(p)!r}, <title> {title(p)!r}")
    shiki = shiki or 'class="shiki' in p
if not shiki:
    bad("no sample post renders its code block through shiki")

# The changelog and its three releases.
s, _, body = get("/changelog")
log = body.decode()
if s != 200 or {r for r in RELEASES if f'href="/changelog/{r}"' in log} != set(RELEASES):
    bad(f"/changelog answered {s} or does not link every sample release")
for slug in RELEASES:
    s, _, body = get(f"/changelog/{slug}")
    if s != 200 or NOTICE not in body.decode():
        bad(f"/changelog/{slug} answered {s}")

# Feeds, sitemap and robots: absolute, and for THIS environment's origin.
for path, want in (("/blog/rss.xml", f"{origin}/blog/{POSTS[0]}"), ("/changelog/rss.xml", f"{origin}/changelog/{RELEASES[0]}"),
                   ("/sitemap.xml", f"<loc>{origin}/blog/{POSTS[0]}</loc>"), ("/robots.txt", f"Sitemap: {origin}/sitemap.xml")):
    s, ctype, body = get(path)
    if s != 200 or want not in body.decode():
        bad(f"{path} answered {s} {ctype} without {want!r}")

# The health check, the 404s.
s, _, body = get("/api/health")
try:
    health = json.loads(body)
except ValueError:
    health = None
if s != 200 or health != {"ok": True, "content": "sample"}:
    bad(f"/api/health answered {s} {body[:80]!r}, want ok and the sample content")
for path in ("/no-such-page", "/blog/no-such-post", "/changelog/no-such-release"):
    s, _, _ = get(path)
    if s != 404:
        bad(f"{path} answered {s}, want 404")

# Static assets, served by the Worker's ASSETS binding: a script, a font, the
# sample images.
chunk = re.search(r'src="(/_next/static/[^"]+\.js)"', page)
font = re.search(r'href="(/_next/static/media/[^"]+\.woff2)"', page)
for found, kind in ((chunk, "javascript"), (font, "font")):
    if not found:
        bad(f"the home page loads no {kind} from /_next/static")
        continue
    s, ctype, _ = get(found.group(1))
    if s != 200 or kind not in ctype:
        bad(f"{found.group(1)} answered {s} {ctype}")
if "fonts.googleapis.com" in page or "fonts.gstatic.com" in page:
    bad("the home page loads a font from Google")
for img in ("/sample/logo-dark.svg", "/sample/post-dark.svg"):
    s, ctype, _ = get(img)
    if s != 200 or not ctype.startswith("image/svg"):
        bad(f"{img} answered {s} {ctype}")

if problems:
    for p in problems:
        print(f"  ✕ {p}", file=sys.stderr)
    sys.exit(1)
print(f"   five pages, the blog and three posts, the changelog and three releases, unconnected and saying so,")
print(f"   named {name!r}; feeds, sitemap and robots for {origin}; health 'sample'; three 404s; assets and fonts")
PY
stop_dev

# ── 4. connected, to a stand-in BaseHub ────────────────────────────────────
echo "── connected: the lane's build again, with a token, against a stand-in BaseHub"
for p in 3000 3001; do
  ! curl -s -o /dev/null --max-time 2 "http://localhost:$p/" \
    || { echo "FAIL: port $p is taken; the stand-in BaseHub needs it" >&2; exit 1; }
done
token="bshb_e2e_standin_$(python3 -c 'import secrets;print(secrets.token_hex(8))')"
node "$here/lib/fake-basehub.mjs" "$work/apps/web" "$token" "$scratch/fake.log" > "$scratch/fake.out" 2>&1 &
fake_pid=$!
for _ in $(seq 1 60); do grep -q '"ready":true' "$scratch/fake.log" 2>/dev/null && break; sleep 0.5; done
grep -q '"ready":true' "$scratch/fake.log" 2>/dev/null || { echo "FAIL: the stand-in BaseHub never started" >&2; cat "$scratch/fake.out" >&2; exit 1; }
rm -rf "$work/apps/web/.next" "$work/apps/web/.open-next" "$work/apps/web/.wrangler"
if ! (cd "$work/$(cat "$scratch/steps/path")/$(cat "$scratch/steps/build-app.wd")" && \
      { [ -f "$scratch/steps/env" ] && source "$scratch/steps/env"; true; } && \
      export ORUN_ENVIRONMENT=stage BASEHUB_TOKEN="$token" BASEHUB_DEBUG_FORCED_URL=http://localhost:3001/graphql && \
      bash -e "$scratch/steps/build-app.sh") > "$scratch/build-connected.log" 2>&1; then
  echo "FAIL: the lane's build-app step, connected" >&2; tail -40 "$scratch/build-connected.log" >&2; exit 1
fi
echo "   ▸ build-app, with BASEHUB_TOKEN set and the SDK on the stand-in"
# Any request the Worker itself makes to BaseHub goes to the stand-in too.
serve_worker --var "BASEHUB_DEBUG_FORCED_URL:http://localhost:3001/graphql"
python3 - "$url" "$scratch/fake.log" "$token" "$work/apps/web" "$values" <<'PY'
import html, json, os, re, sys, urllib.error, urllib.request
base, logfile, token, app, values = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], json.load(open(sys.argv[5]))
entries = [json.loads(l) for l in open(logfile) if l.strip()]
stand_in = next(e["standIn"] for e in entries if e.get("ready"))
problems = []
def bad(m): problems.append(m)
def get(path):
    try:
        with urllib.request.urlopen(base + path, timeout=60) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
def title(page):
    m = re.search(r"<title>(.*?)</title>", page, re.S)
    return html.unescape(m.group(1)) if m else None
def h1(page):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else None
NOTICE = 'data-basehub="not-connected"'
site, post = stand_in["siteName"], stand_in["firstPost"]

s, body = get("/api/health")
if s != 200 or json.loads(body or "null") != {"ok": True, "content": "basehub"}:
    bad(f"/api/health answered {s} {body[:80]!r}, want the BaseHub repository's content")
s, page = get("/")
if s != 200 or title(page) != f"Home | {site}" or h1(page) != stand_in["heroTitle"]:
    bad(f"/ answered {s}, <title> {title(page)!r}, heading {h1(page)!r} — not the stand-in repository's")
if NOTICE in page:
    bad("the connected home page still says it is unconnected")
if "Launch the site your product deserves" in page or values["productname"] in html.unescape(page):
    bad("the connected home page still shows the sample content")
if "assets.basehub.com/standin/" not in page:
    bad("the connected home page does not show the repository's image from BaseHub's asset host")
s, blog = get("/blog")
if s != 200 or f'href="/blog/{post["slug"]}"' not in blog or 'placeholder="Search"' not in blog:
    linked, search = f'href="/blog/{post["slug"]}"' in blog, 'placeholder="Search"' in blog
    bad(f"/blog answered {s}; links the stand-in's first post: {linked}; search box: {search}")
s, p = get(f"/blog/{post['slug']}")
if s != 200 or h1(p) != post["title"] or title(p) != f"{post['title']} | {site}":
    bad(f"/blog/{post['slug']} answered {s}, heading {h1(p)!r}, <title> {title(p)!r}")
s, _ = get("/changelog/dark-mode")
if s != 200:
    bad(f"/changelog/dark-mode answered {s}")

# The build asked the stand-in — the ref, then the queries — with the token,
# and nothing it asked went unanswered.
asked = [e for e in entries if "status" in e]
if not any(e["path"] == "/api/git/resolve-ref" and e["status"] == 200 for e in asked):
    bad("the build never resolved its ref with the stand-in")
if sum(1 for e in asked if e["path"] == "/graphql" and e["status"] == 200) < 5:
    bad("the build sent the stand-in fewer than five queries")
for e in entries:
    if e.get("error") or ("status" in e and (e["status"] != 200 or not e["tokenOk"])):
        bad(f"the stand-in refused or failed a request: {json.dumps(e)[:300]}")

# The token is in the server bundle only: no file the Worker serves as a
# static asset carries it.
for root, _, files in os.walk(os.path.join(app, ".open-next/assets")):
    for f in files:
        with open(os.path.join(root, f), "rb") as fh:
            if token.encode() in fh.read():
                bad(f"{os.path.relpath(os.path.join(root, f), app)} carries the BaseHub token")

if problems:
    for p in problems:
        print(f"  ✕ {p}", file=sys.stderr)
    sys.exit(1)
n = sum(1 for e in asked if e["path"] == "/graphql")
print(f"   the stand-in's site {site!r}, its hero, first post and image host, no bar, a search box, health 'basehub';")
print(f"   {n} queries and the ref asked of it with the token; the token in no static asset")
PY
stop_dev

echo "e2e.test.sh: ok"
