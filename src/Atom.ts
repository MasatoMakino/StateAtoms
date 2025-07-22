import EventEmitter from "eventemitter3";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * A class that holds primitive values and emits events when those values change.
 *
 * The Atom class provides reactive state management by automatically emitting
 * events when its value changes. It supports serialization control and integrates
 * with the AtomContainer for hierarchical state management.
 *
 * @template T - The type of value this atom holds
 *
 * @example
 * ```typescript
 * const numberAtom = new Atom(42);
 * numberAtom.on("change", (args) => {
 *   console.log(`Value changed from ${args.valueFrom} to ${args.value}`);
 * });
 *
 * numberAtom.value = 100; // Emits "change" event
 * ```
 *
 * @example
 * ```typescript
 * // Create atom that won't be serialized
 * const tempAtom = new Atom("temp", { isSkipSerialization: true });
 * ```
 *
 * @since 0.1.0
 * @see {@link AtomContainer} for managing multiple atoms
 * @see {@link ObjectAtom} for objects requiring deep equality comparison
 */
export class Atom<T> extends EventEmitter<AtomEvents<T>> {
  protected _value: T;

  /**
   * Determines whether this atom should be excluded from serialization
   * operations like AtomContainer.toJson() and toObject().
   *
   * @default false
   */
  readonly isSkipSerialization: boolean;

  /**
   * Creates a new Atom instance.
   *
   * Atom uses strict equality (`===`) for change detection, making it ideal for
   * primitive values. For complex objects requiring deep equality comparison,
   * consider using ObjectAtom instead.
   *
   * @param initialValue - The initial value for this atom
   * @param options - Configuration options
   * @param options.isSkipSerialization - Whether to exclude this atom from serialization
   *
   * @see {@link ObjectAtom} for deep equality comparison of objects
   */
  constructor(initialValue: T, options?: { isSkipSerialization?: boolean }) {
    super();
    this._value = initialValue;
    this.isSkipSerialization = options?.isSkipSerialization ?? false;
  }

  /**
   * Gets the current value of this atom.
   *
   * @returns The current value
   */
  get value() {
    return this._value;
  }

  /**
   * Sets a new value for this atom. If the new value is different from the current value,
   * it will emit "beforeChange" and "change" events.
   *
   * Uses strict equality (`===`) for change detection, which is optimal for primitive values
   * like numbers, strings, and booleans. For objects, dates, or complex types requiring
   * deep equality comparison, consider using ObjectAtom instead.
   *
   * @param newValue - The new value to set
   *
   * @example
   * ```typescript
   * const atom = new Atom(1);
   * atom.value = 2; // Emits events
   * atom.value = 2; // No events (same value)
   * ```
   *
   * @example
   * ```typescript
   * // For objects, use ObjectAtom for proper deep equality
   * const dateAtom = new Atom(new Date("2024-01-01"));
   * dateAtom.value = new Date("2024-01-01"); // Emits event (different references)
   * // Consider: new ObjectAtom(new Date("2024-01-01")) for deep equality
   * ```
   *
   * @see {@link ObjectAtom} for deep equality comparison of complex objects
   */
  set value(newValue: T) {
    if (this._value === newValue) {
      return;
    }
    this.updateValue(this._value, newValue);
  }

  /**
   * Internal method to update the atom's value and emit change events.
   * This method is called by the value setter and can be overridden in subclasses
   * to customize change detection behavior.
   *
   * @param oldValue - The previous value
   * @param newValue - The new value
   *
   * @emits beforeChange - Fired before the value is updated
   * @emits change - Fired after the value is updated
   *
   * @protected
   */
  protected updateValue(oldValue: T, newValue: T) {
    const args = {
      from: this,
      value: newValue,
      valueFrom: oldValue,
    };
    this.emit("beforeChange", {
      ...args,
    });
    this._value = newValue;
    this.emit("change", {
      ...args,
    });
  }
}
