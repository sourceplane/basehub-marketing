// The site's own origin, for the sitemap, the feeds and absolute links. Each
// deploy builds for its environment's origin: NEXT_PUBLIC_SITE_URL is set by
// the build (apps/web/component.yaml) to the environment's SITE_URL, else its
// workers.dev URL. Upstream read Vercel's VERCEL_PROJECT_PRODUCTION_URL and
// fell back to its own demo's domain.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
export const siteHost = new URL(siteUrl).host;
