import EventEmitter from "eventemitter3";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * プリミティブな値を保持し、その値が変更された際にイベントを発行するクラス
 */
export class Atom<T> extends EventEmitter<AtomEvents<T>> {
  protected _value: T;
  /**
   * AtomContainer.toJson, toObjectなどの関数によってシリアライズの対象となるか否か
   * @default false
   */
  readonly isSkipSerialization: boolean;

  constructor(initialValue: T, options?: { isSkipSerialization?: boolean }) {
    super();
    this._value = initialValue;
    this.isSkipSerialization = options?.isSkipSerialization ?? false;
  }

  get value() {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value === newValue) {
      return;
    }
    this.updateValue(this._value, newValue);
  }

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
