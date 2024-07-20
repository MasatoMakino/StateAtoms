import EventEmitter from "eventemitter3";
import { Atom, AtomEvents } from "./Atom";

export class AtomContainer extends EventEmitter<AtomEvents<undefined>> {
  constructor() {
    super();
  }

  /**
   * このクラスに保持されているAtomおよびAtomContainerの値をJSON文字列に変換する。
   * @returns string
   */
  toJson(): string {
    const json = {};
    for (const [key, value] of Object.entries(this)) {
      if (value instanceof AtomContainer) {
        json[key] = value.toJson();
      } else if (value instanceof Atom) {
        json[key] = value.value;
      }
    }
    return JSON.stringify(json);
  }

  /**
   * json文字列からAtomおよびAtomContainerの値を復元する。
   * @param json
   */
  fromJson(json: string): void {
    const jsonObj = JSON.parse(json);
    for (const [key, value] of Object.entries(jsonObj)) {
      if (this[key] instanceof AtomContainer) {
        this[key].fromJson(JSON.stringify(value));
      }
      if (this[key] instanceof Atom) {
        this[key].value = value;
      }
    }
  }
}
