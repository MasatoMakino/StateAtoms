import EventEmitter from "eventemitter3";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * Configuration options for Atom instances.
 *
 * @since 0.1.0
 */
export type AtomOptionsModern = {
  /**
   * Whether to exclude this atom from `AtomContainer.toObject()` and
   * `AtomContainer.toJson()` output.
   *
   * The container restores this atom through `fromObject()`,
   * `fromJson()`, and `load()`, and records it in history for `undo()`
   * and `redo()`. Use this for temporary state that the server does not need,
   * such as screen transition state. This option is not a security feature.
   *
   * @default false
   */
  skipSerialization?: boolean;
};

/**
 * Legacy configuration options for Atom instances.
 *
 * @deprecated Use `AtomOptionsModern` instead.
 * @since 0.1.0
 */
export type AtomOptionsLegacy = {
  /**
   * Whether to exclude this atom from serialization operations.
   *
   * @deprecated Use `skipSerialization` instead.
   * @default false
   */
  isSkipSerialization?: boolean;
};

/**
 * Configuration options for Atom instances. Accepts `AtomOptionsModern` and
 * the deprecated `AtomOptionsLegacy`.
 *
 * @since 0.1.0
 */
export type AtomOptions = AtomOptionsModern | AtomOptionsLegacy;

/**
 * Holds a value and emits `change` when the value changes.
 *
 * Atom compares values with strict equality (`===`). For objects that need
 * deep equality, use {@link ObjectAtom}.
 *
 * Atom does not emit `addHistory` when its value changes. Emit `addHistory`
 * at the end of an interaction, such as a drag end, so that one undo step
 * matches one user action. Code that emits `addHistory` on an atom does not
 * need a reference to the containers of the atom.
 *
 * @template T - The type of value this atom holds
 *
 * @example
 * ```typescript
 * // Screen transition state: not sent to the server, but restorable and undoable
 * const currentPage = new Atom("home", { skipSerialization: true });
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
 * @see {@link https://github.com/MasatoMakino/StateAtoms/blob/main/docs/ui-integration-patterns.md | UI Integration Patterns} for comprehensive UI integration examples
 */
export class Atom<T> extends EventEmitter<AtomEvents<T>> {
  protected _value: T;

  /**
   * Determines whether a container excludes this atom from
   * AtomContainer.toObject() and toJson() output. Restore and history
   * include it.
   *
   * @default false
   * @see {@link AtomOptionsModern.skipSerialization}
   */
  readonly skipSerialization: boolean;

  constructor(initialValue: T, options?: AtomOptionsModern);

  /**
   * @deprecated Use the constructor with `AtomOptionsModern` instead.
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
   * @deprecated Use `skipSerialization` instead.
   */
  get isSkipSerialization(): boolean {
    return this.skipSerialization;
  }

  get value() {
    return this._value;
  }

  /**
   * Emits `beforeChange` and `change` when the new value differs from the
   * current value by strict equality (`===`).
   *
   * Writing to a field of the object that `value` returns does not run this
   * setter: no event fires, and history snapshots that share the object change.
   *
   * @example
   * ```typescript
   * // Different Date instances differ by `===`, so this assignment emits events.
   * const dateAtom = new Atom(new Date("2024-01-01"));
   * dateAtom.value = new Date("2024-01-01");
   * ```
   *
   * @see {@link ObjectAtom} for deep equality comparison
   */
  set value(newValue: T) {
    if (this._value === newValue) {
      return;
    }
    this.updateValue(this._value, newValue);
  }

  /**
   * Writes the new value. Emits `beforeChange` before the write and `change`
   * after it. The value setter calls this method after change detection.
   * Subclasses can override this method.
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

  /**
   * Removes every listener on this atom to prevent memory leaks.
   *
   * The removal includes listeners of other containers and UI code that share
   * this atom. This is the designed behavior. Discard the atom after
   * `dispose()`.
   *
   * @since 0.3.1
   */
  dispose(): void {
    this.removeAllListeners();
  }
}
