import { parseFormData, sendEvent as connectedSendEvent } from "basehub/events";

import { isSampleKey } from "./connection";

/**
 * BaseHub's `sendEvent` — analytics (page views, clicks) and form
 * submissions, which BaseHub keeps against the repository's ingest key. The
 * sample content's keys name no repository, so before BaseHub is connected an
 * event is accepted and dropped instead of failing against BaseHub's API.
 */
export const sendEvent = (async (...args: Parameters<typeof connectedSendEvent>) => {
  if (isSampleKey(args[0] as string)) return { success: true, eventId: "not-connected" } as const;
  return connectedSendEvent(...args);
}) as typeof connectedSendEvent;

export { parseFormData };
