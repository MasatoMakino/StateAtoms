import { deepEqual } from "fast-equals";
import { Atom } from "./Atom.js";

/**
 * A class that holds object values and emits events when those values change.
 *
 * Unlike the base Atom class, ObjectAtom uses deep equality comparison via fast-equals
 * to determine if the object value has actually changed. This prevents unnecessary
 * event emissions when objects are structurally identical but not reference-equal.
 *
 * @template T - The type of object this atom holds
 *
 * @example
 * ```typescript
 * const userAtom = new ObjectAtom({ name: "John", age: 30 });
 *
 * userAtom.on("change", (args) => {
 *   console.log("User changed:", args.value);
 * });
 *
 * // This will NOT emit an event (deep equality)
 * userAtom.value = { name: "John", age: 30 };
 *
 * // This WILL emit an event (different values)
 * userAtom.value = { name: "Jane", age: 25 };
 * ```
 *
 * @example
 * ```typescript
 * // Works with nested objects
 * const configAtom = new ObjectAtom({
 *   theme: { mode: "dark", color: "blue" },
 *   settings: { autoSave: true }
 * });
 *
 * // No event (structurally identical)
 * configAtom.value = {
 *   theme: { mode: "dark", color: "blue" },
 *   settings: { autoSave: true }
 * };
 * ```
 *
 * @warning Error objects with identical messages may still trigger change events
 * due to different stack traces. Error instances are compared using deep equality,
 * and stack traces make them structurally different even when logically equivalent.
 *
 * @warning Circular references in objects will cause a stack overflow error.
 * The fast-equals library cannot handle circular object structures safely.
 *
 * @since 0.1.0
 * @see {@link Atom} for primitive value atoms with reference equality
 * @see {@link AtomContainer} for managing multiple atoms
 */
export class ObjectAtom<T> extends Atom<T> {
  /**
   * Gets the current value of this atom.
   *
   * @returns The current value
   */
  get value() {
    return this._value;
  }

  /**
   * Sets a new value for this atom using deep equality comparison.
   * If the new value is deeply equal to the current value, no events are emitted.
   *
   * @param newValue - The new value to set
   *
   * @example
   * ```typescript
   * const atom = new ObjectAtom({ count: 1 });
   * atom.value = { count: 1 }; // No event (deep equal)
   * atom.value = { count: 2 }; // Event emitted (different)
   * ```
   */
  set value(newValue: T) {
    if (deepEqual(this._value, newValue)) {
      return;
    }
    this.updateValue(this._value, newValue);
  }
}
