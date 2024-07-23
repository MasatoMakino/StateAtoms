import EventEmitter from "eventemitter3";
import { Atom, AtomEventArgs, AtomEvents } from "./Atom";

/**
 * 複数のAtomおよびAtomContainerを保持し、その値が変更された際にイベントを発行するクラス
 * 
 * @template DataType このクラスが保持する値の型
 * @template EventsType このクラスが発行するイベントの型
 */
export class AtomContainer<
  DataType = any,
  EventTypes extends AtomEvents<unknown> = AtomEvents<unknown>,
> extends EventEmitter<AtomEvents<unknown> | EventTypes> {
  /**
   * AtomContainer.toJson, toObjectなどの関数によってシリアライズの対象となるか否か
   * @default false
   */
  readonly isSkipSerialization: boolean;

  constructor(options?: { isSkipSerialization?: boolean }) {
    super();
    this.isSkipSerialization = options?.isSkipSerialization ?? false;
  }

  /**
   * このクラスに保持されているAtomおよびAtomContainerの値が変更された際にイベントを発行する
   * このイベントはAtomContainerのルートまで伝播する
   */
  protected addMembers() {
    for (const value of Object.values(this)) {
      if (value instanceof Atom || value instanceof AtomContainer) {
        this.add(value);
      }
    }
  }

  private add(value: Atom<unknown> | AtomContainer) {
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

  /**
   * このクラスに保持されているAtomおよびAtomContainerの値をオブジェクトにコピーする。
   * @returns T
   */
  toObject(): DataType {
    const obj = {};
    for (const [key, value] of Object.entries(this)) {
      if (value instanceof AtomContainer && !value.isSkipSerialization) {
        obj[key] = value.toObject();
      } else if (value instanceof Atom && !value.isSkipSerialization) {
        obj[key] = value.value;
      }
    }
    return obj as DataType;
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
  fromObject(obj: DataType): void {
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
