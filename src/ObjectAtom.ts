import { deepEqual } from "fast-equals";
import { Atom } from "./Atom.js";

/**
 * An atom that compares values with deep equality through fast-equals.
 * Assigning a structurally identical object emits no event.
 *
 * ObjectAtom is for a value that changes as a whole. See {@link https://github.com/MasatoMakino/StateAtoms/blob/main/README.md#objectatom-for-complex-data | ObjectAtom for Complex Data}.
 *
 * Two Error instances with the same message can still differ, because the
 * comparison includes their stack traces. A circular reference causes a
 * stack overflow.
 *
 * @template T - The type of object this atom holds
 *
 * @example
 * ```typescript
 * const userAtom = new ObjectAtom({ name: "John", age: 30 });
 * userAtom.value = { name: "John", age: 30 }; // No event (deep equal)
 * userAtom.value = { name: "Jane", age: 25 }; // Emits events
 * ```
 *
 * @since 0.1.0
 */
export class ObjectAtom<T> extends Atom<T> {
  // A subclass that defines only a setter loses the inherited getter.
  get value() {
    return this._value;
  }

  /**
   * Emits `beforeChange` and `change` when the new value is not deeply equal
   * to the current value.
   */
  set value(newValue: T) {
    if (deepEqual(this._value, newValue)) {
      return;
    }
    this.updateValue(this._value, newValue);
  }
}
