import { deepEqual } from "fast-equals";
import { Atom } from "./Atom.js";

/**
 * オブジェクトを保持し、その値が変更された際にイベントを発行するクラス
 * Atomと異なり、等価性の判定にfast-equalsを使用する
 */
export class ObjectAtom<T> extends Atom<T> {
  set value(newValue: T) {
    if (deepEqual(this._value, newValue)) {
      return;
    }
    this.updateValue(this._value, newValue);
  }
}
