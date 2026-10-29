import type { Atom } from "./Atom.js";

/**
 * Event arguments of `beforeChange` and `change`.
 *
 * @template T - The type of value held by the atom
 *
 * @since 0.1.0
 */
export interface AtomEventArgs<T> {
  /**
   * The atom whose value changes. A handler that several atoms share uses it
   * to identify the source.
   */
  from: Atom<T>;

  /**
   * The new value.
   */
  value: T;

  /**
   * The value before the change.
   */
  valueFrom: T;
}
