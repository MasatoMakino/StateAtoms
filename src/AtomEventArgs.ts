import type { Atom } from "./Atom.js";

/**
 * Event arguments passed to atom change event handlers.
 * 
 * This interface defines the structure of event data that is passed to
 * listeners when an atom's value changes. It provides information about
 * the atom that changed, the new value, and the previous value.
 * 
 * @template T - The type of value held by the atom
 * 
 * @example
 * ```typescript
 * const atom = new Atom(42);
 * 
 * atom.on("change", (args: AtomEventArgs<number>) => {
 *   console.log(`${args.from.constructor.name} changed`);
 *   console.log(`From: ${args.valueFrom} to: ${args.value}`);
 * });
 * 
 * atom.value = 100;
 * // Output:
 * // Atom changed
 * // From: 42 to: 100
 * ```
 * 
 * @since 0.1.0
 * @see {@link Atom} for the atom class that emits these events
 * @see {@link AtomEvents} for the complete event interface
 */
export interface AtomEventArgs<T> {
  /**
   * The atom instance that triggered the event.
   * This allows event handlers to identify which atom changed,
   * especially useful when multiple atoms share the same handler.
   */
  from: Atom<T>;
  
  /**
   * The new value that the atom was set to.
   * This is the current value of the atom after the change.
   */
  value: T;
  
  /**
   * The previous value that the atom held before the change.
   * This allows event handlers to compare the old and new values.
   */
  valueFrom: T;
}
