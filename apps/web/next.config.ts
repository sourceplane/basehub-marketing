import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // The template's own: BaseHub assets, resized by BaseHub's own image loader
  // (basehub/next-image), so the Worker needs no image optimiser. The sample
  // content's images are local files rendered unoptimized
  // (lib/basehub/image.tsx).
  images: {
    remotePatterns: [{ hostname: "assets.basehub.com" }, { hostname: "basehub.earth" }],
  },
  // The repository's read token, inlined into the SERVER bundle at build time:
  // every page is pre-rendered by the build. A deploy takes it from its
  // environment's BASEHUB_TOKEN Orun secret (apps/web/component.yaml); unset,
  // it is empty and the site renders its bundled sample content. Only server
  // code (lib/basehub/client.ts and pump.tsx, `server-only`) reads it, so it
  // never reaches a browser.
  env: {
    BASEHUB_TOKEN: process.env.BASEHUB_TOKEN ?? "",
  },
  // Required by @opennextjs/cloudflare, which bundles `.next/standalone/**`
  // into the Worker. Trace from the monorepo root so workspace dependencies
  // resolve from the root node_modules.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
} satisfies NextConfig;

export default nextConfig;
