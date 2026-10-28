import "server-only";

import { Pump as ConnectedPump } from "basehub/react-pump";

import { isBaseHubConnected } from "./connection";
import { sampleQuery } from "./sample";

/**
 * `<Pump>`, as the template uses it: BaseHub's own when the site has a
 * repository (it adds draft mode and live preview), and otherwise the same
 * render-prop answered from the sample content.
 */
export const Pump = (async (props: {
  queries: unknown[];
  children: (data: unknown[]) => Promise<React.ReactNode> | React.ReactNode;
}) => {
  if (isBaseHubConnected()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Connected = ConnectedPump as any;
    return <Connected {...props} />;
  }
  return props.children(props.queries.map((query) => sampleQuery(query)));
}) as unknown as typeof ConnectedPump;
