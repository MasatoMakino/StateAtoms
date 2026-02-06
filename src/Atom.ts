import EventEmitter from "eventemitter3";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * Modern configuration options for Atom instances.
 * This is the preferred API that uses consistent naming conventions.
 *
 * @since 0.1.0
 */
export type AtomOptionsModern = {
  /**
   * Whether to exclude this atom from serialization operations.
   *
   * @default false
   */
  skipSerialization?: boolean;
};

/**
 * Legacy configuration options for Atom instances.
 *
 * @deprecated Use AtomOptionsModern with skipSerialization instead
 * @since 0.1.0
 */
export type AtomOptionsLegacy = {
  /**
   * Whether to exclude this atom from serialization operations.
   *
   * @deprecated Use `skipSerialization` instead. This property will be removed in a future version.
   * @default false
   */
  isSkipSerialization?: boolean;
};

/**
 * Configuration options for Atom instances.
 *
 * Currently supports both modern and legacy APIs for backward compatibility.
 *
 * @since 0.1.0
 *
 * @remarks
 * **Migration Plan:**
 * - In a future major version, legacy support (AtomOptionsLegacy) will be removed
 * - AtomOptionsModern will be renamed to AtomOptions
 * - This union type structure will be simplified to contain only the modern API
 *
 * **Recommended Usage:**
 * Use AtomOptionsModern directly for new code to avoid future migration needs.
 */
export type AtomOptions = AtomOptionsModern | AtomOptionsLegacy;

/**
 * A class that holds primitive values and emits events when those values change.
 *
 * The Atom class provides reactive state management by automatically emitting
 * events when its value changes. It supports serialization control and integrates
 * with the AtomContainer for hierarchical state management.
 *
 * ## Event System Design
 *
 * Atom emits two types of events with distinct purposes:
 * - **`change`**: Automatically emitted for immediate UI updates and state synchronization
 * - **`addHistory`**: Manually emitted to request history snapshots at appropriate user interaction boundaries
 *
 * ### Why Manual History Events?
 *
 * History events are **not** automatically emitted on value changes to prevent UI performance
 * issues and poor undo/redo user experience. In high-frequency UI interactions (like dragging
 * sliders), automatic history would create excessive snapshots that make undo operations
 * unusable. Instead, applications control when meaningful state snapshots are created.
 *
 * ### Loose Coupling with UI
 *
 * This design allows UI components to request history snapshots without knowing about
 * parent containers, maintaining clean separation of concerns.
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
 * @example
 * ```typescript
 * // Manual history management for slider UI
 * const sliderAtom = new Atom(0);
 *
 * // During drag: Update value immediately for UI responsiveness
 * slider.addEventListener('input', (e) => {
 *   sliderAtom.value = e.target.value; // Only emits "change"
 * });
 *
 * // On drag end: Request history snapshot
 * slider.addEventListener('change', (e) => {
 *   sliderAtom.emit('addHistory'); // Request meaningful snapshot
 * });
 * ```
 *
 * @since 0.1.0
 * @see {@link AtomContainer} for managing multiple atoms
 * @see {@link ObjectAtom} for objects requiring deep equality comparison
 * @see `.claude/skills/ui-integration-patterns/SKILL.md` for comprehensive UI integration examples
 */
export class Atom<T> extends EventEmitter<AtomEvents<T>> {
  protected _value: T;

  /**
   * Determines whether this atom should be excluded from serialization
   * operations like AtomContainer.toJson() and toObject().
   *
   * @default false
   */
  readonly skipSerialization: boolean;

  /**
   * Creates a new Atom instance.
   *
   * Atom uses strict equality (`===`) for change detection, making it ideal for
   * primitive values. For complex objects requiring deep equality comparison,
   * consider using ObjectAtom instead.
   *
   * @param initialValue - The initial value for this atom
   * @param options - Configuration options
   *
   * @see {@link ObjectAtom} for deep equality comparison of objects
   */
  constructor(initialValue: T, options?: AtomOptionsModern);

  /**
   * Creates a new Atom instance with legacy options.
   *
   * @deprecated Use the constructor with AtomOptionsModern instead
   * @param initialValue - The initial value for this atom
   * @param options - Legacy configuration options
   */
  constructor(initialValue: T, options?: AtomOptionsLegacy);

  constructor(initialValue: T, options?: AtomOptions) {
    super();
    this._value = initialValue;
    this.skipSerialization =
      (options as AtomOptionsModern)?.skipSerialization ??
      (options as AtomOptionsLegacy)?.isSkipSerialization ??
      false;
  }

  /**
   * Determines whether this atom should be excluded from serialization
   * operations like AtomContainer.toJson() and toObject().
   *
   * @deprecated Use `skipSerialization` instead. This property will be removed in a future version.
   * @default false
   */
  get isSkipSerialization(): boolean {
    return this.skipSerialization;
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
