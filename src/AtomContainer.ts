import EventEmitter from "eventemitter3";
import { Atom, AtomEventArgs, AtomEvents } from "./Atom";

export class AtomContainer<T = any> extends EventEmitter<AtomEvents<unknown>> {
  constructor() {
    super();

    for (const value of Object.values(this)) {
      if (value instanceof Atom || value instanceof AtomContainer) {
        value.on("beforeChange", (arg: AtomEventArgs<any>) => {
          this.emit("beforeChange", arg);
        });
        value.on("change", (arg: AtomEventArgs<any>) => {
          this.emit("change", arg);
        });
        value.on("addHistory", () => {
          this.emit("addHistory");
        });
      }
    }
  }

  /**
   * このクラスに保持されているAtomおよびAtomContainerの値をオブジェクトにコピーする。
   * @returns T
   */
  toObject(): T {
    const obj = {};
    for (const [key, value] of Object.entries(this)) {
      if (value instanceof AtomContainer) {
        obj[key] = value.toObject();
      } else if (value instanceof Atom) {
        obj[key] = value.value;
      }
    }
    return obj as T;
  }
  /**
   * このクラスに保持されているAtomおよびAtomContainerの値をJSON文字列に変換する。
   * @returns string
   */
  toJson(): string {
    const obj = this.toObject();
    return JSON.stringify(obj);
  }

  /**
   * ObjectからAtomおよびAtomContainerの値を復元する。
   * @param json
   */
  fromObject(obj: T): void {
    for (const [key, value] of Object.entries(obj as {})) {
      if (this[key] instanceof AtomContainer) {
        this[key].fromObject(value);
      }
      if (this[key] instanceof Atom) {
        this[key].value = value;
      }
    }
  }

  /**
   * json文字列からAtomおよびAtomContainerの値を復元する。
   * @param json
   */
  fromJson(json: string): void {
    const jsonObj = JSON.parse(json);
    this.fromObject(jsonObj);
  }
}
