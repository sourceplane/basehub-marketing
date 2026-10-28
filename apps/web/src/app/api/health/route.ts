import { isBaseHubConnected } from "@/lib/basehub/connection";

// Answered by the Worker on every request (not pre-rendered): the deploy's
// smoke test, and the deployment record's probe, read it.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, content: isBaseHubConnected() ? "basehub" : "sample" });
}
