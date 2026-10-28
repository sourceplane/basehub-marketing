import { project } from "./project";
import { SAMPLE } from "./content";

/**
 * A BaseHub query answered from the bundled sample content. Untyped here on
 * purpose: the result's type is the SDK's to infer from the selection, and
 * the client and Pump wrappers carry the SDK's own signatures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sampleQuery(selection: unknown): any {
  return project(SAMPLE, selection);
}
