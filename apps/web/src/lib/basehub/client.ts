import "server-only";

import { basehub as connectedBasehub } from "basehub";

import { isBaseHubConnected } from "./connection";
import { sampleQuery } from "./sample";

/**
 * `basehub()`, as the template calls it — the BaseHub SDK's client when the
 * site has a repository (BASEHUB_TOKEN), and the bundled sample content
 * otherwise. Same call, same result shape: `query()` projects the sample tree
 * onto the selection the page asked for (lib/basehub/sample/project.ts).
 */
export const basehub = ((options?: Parameters<typeof connectedBasehub>[0]) => {
  if (isBaseHubConnected()) return connectedBasehub(options);
  return {
    query: async (selection: unknown) => sampleQuery(selection),
    mutation: async () => {
      throw new Error("BaseHub is not connected: there is no repository to write to.");
    },
  };
}) as unknown as typeof connectedBasehub;
