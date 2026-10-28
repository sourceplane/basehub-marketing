// Whether the site has a BaseHub repository to read.
//
// BASEHUB_TOKEN is the repository's read token: an Orun secret per
// environment, inlined into the SERVER bundle at build time (next.config.ts
// `env`) because every page is pre-rendered by the build. A build without it
// is a site that is not connected yet, not a broken one: every query answers
// from the bundled sample content (lib/basehub/sample), the forms and the
// analytics events do nothing, and the header says how to connect a
// repository. Upstream threw "Token not found" and the build failed.
export function isBaseHubConnected(): boolean {
  return Boolean(process.env.BASEHUB_TOKEN?.trim());
}

// The ingest and search keys the sample content carries. A BaseHub key is
// `<id>:<secret>`; these name no repository, so the event and search
// wrappers know to do nothing with them.
export const SAMPLE_INGEST_KEY = "sample:not-connected" as const;
export const SAMPLE_SEARCH_KEY = "sample:not-connected" as const;

export function isSampleKey(key: string | null | undefined): boolean {
  return !key || key.startsWith("sample:");
}
