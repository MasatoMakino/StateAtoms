import type { AtomEventArgs } from "./AtomEventArgs.js";

/**
 * Event types that can be emitted by Atoms and AtomContainers.
 *
 * This interface defines the complete set of events that atoms can emit
 * during their lifecycle. These events enable reactive programming patterns
 * by allowing observers to respond to state changes.
 *
 * @template T - The type of value held by the atom
 *
 * @example
 * ```typescript
 * const atom = new Atom(42);
 *
 * // Listen to beforeChange event
 * atom.on("beforeChange", (args) => {
 *   console.log(`About to change from ${args.valueFrom} to ${args.value}`);
 *   // Validation or side effects before change
 * });
 *
 * // Listen to change event
 * atom.on("change", (args) => {
 *   console.log(`Changed from ${args.valueFrom} to ${args.value}`);
 *   // React to completed change
 * });
 *
 * // Listen to history events (AtomContainer with history enabled)
 * container.on("addHistory", () => {
 *   console.log("State saved to history");
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe event handling with specific atom types
 * const stringAtom = new Atom<string>("hello");
 *
 * stringAtom.on("change", (args: AtomEventArgs<string>) => {
 *   // args.value and args.valueFrom are strongly typed as string
 *   console.log(`String changed: "${args.valueFrom}" -> "${args.value}"`);
 * });
 * ```
 *
 * @since 0.1.0
 * @see {@link AtomEventArgs} for the event argument structure
 * @see {@link Atom} for the class that emits these events
 * @see {@link AtomContainer} for containers that propagate these events
 */
export interface AtomEvents<T> {
  /**
   * Emitted before an atom's value is changed.
   *
   * This event is fired before the internal value is updated, allowing
   * listeners to perform validation, logging, or other side effects
   * before the change takes place.
   *
   * @param arg - Event arguments containing the atom, new value, and old value
   *
   * @example
   * ```typescript
   * atom.on("beforeChange", (args) => {
   *   if (args.value < 0) {
   *     console.warn("Negative value detected!");
   *   }
   * });
   * ```
   */
  beforeChange: (arg: AtomEventArgs<T>) => void;

  /**
   * Emitted after an atom's value has been changed.
   *
   * This event is fired after the internal value has been updated,
   * allowing listeners to react to the completed state change.
   * This is the most commonly used event for reactive updates.
   *
   * @param arg - Event arguments containing the atom, new value, and old value
   *
   * @example
   * ```typescript
   * atom.on("change", (args) => {
   *   updateUI(args.value);
   *   saveToLocalStorage(args.value);
   * });
   * ```
   */
  change: (arg: AtomEventArgs<T>) => void;

  /**
   * Emitted when a state change should be added to history.
   *
   * This event is used by AtomContainer instances with history enabled
   * to trigger automatic history recording. It's emitted after a change
   * occurs and signals that the current state should be saved for undo/redo.
   *
   * @example
   * ```typescript
   * container.on("addHistory", () => {
   *   console.log("History snapshot taken");
   * });
   * ```
   */
  addHistory: () => void;
}
