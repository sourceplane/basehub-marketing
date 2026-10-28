import { isBaseHubConnected } from "@/lib/basehub/connection";

/**
 * Until a BaseHub repository is connected the site renders its bundled
 * sample content; this bar says so, and how to make the site yours. It
 * disappears on the first build with a BASEHUB_TOKEN.
 */
export function ConnectBaseHub() {
  if (isBaseHubConnected()) return null;
  return (
    <div
      className="bg-accent-500 px-6 py-2 text-center text-sm text-text-on-accent-primary"
      data-basehub="not-connected"
      role="note"
    >
      You are looking at sample content. Connect a BaseHub repository — store its read token as the{" "}
      <code className="font-mono">BASEHUB_TOKEN</code> secret and redeploy — to make this site yours.
    </div>
  );
}
