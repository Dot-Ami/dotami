import { exampleMara } from "./mara";
import type { ExampleFuture } from "./types";

export type { ExampleFuture } from "./types";

/**
 * The invented example futures, by id (docs/architecture/future-cockpit.md § 13). One today: Mara, on the
 * first written road. Each lives in its own file; this list only names them.
 */
export const EXAMPLES: Readonly<Record<string, ExampleFuture>> = { [exampleMara.id]: exampleMara };

/** The front door's third door opens this one. */
export const FRONT_DOOR_EXAMPLE_ID = exampleMara.id;

/** The example with this id, or undefined for any other address. */
export function exampleById(id: string): ExampleFuture | undefined {
  return Object.prototype.hasOwnProperty.call(EXAMPLES, id) ? EXAMPLES[id] : undefined;
}
