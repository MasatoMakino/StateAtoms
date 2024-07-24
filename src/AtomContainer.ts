import EventEmitter from "eventemitter3";
import { Atom } from "./Atom.js";
import { AtomEventArgs } from "./AtomEventArgs.js";
import { AtomEvents } from "./AtomEvents.js";

export type AtomContainerOptions = {
  isSkipSerialization?: boolean;
  useHistory?: boolean;
};

/**
 * 複数のAtomおよびAtomContainerを保持し、その値が変更された際にイベントを発行するクラス
 *
 * @template DataType このクラスが保持する値の型
 * @template EventTypes このクラスが発行するイベントの型
 *   EventTypesを指定することで、このクラスが発行するイベントを拡張できる。
 *   しかし、拡張するとリスナーの引数がanyと解釈されるため推奨しない。
 *   代わりに、カスタムイベントを発行するEventEmitterをメンバー変数として持つことを推奨する。
 */
export class AtomContainer<
  DataType = any,
  EventTypes extends AtomEvents<unknown> = AtomEvents<unknown>,
> extends EventEmitter<EventTypes | AtomEvents<unknown>> {
  /**
   * AtomContainer.toJson, toObjectなどの関数によってシリアライズの対象となるか否か
   * @default false
   */
  readonly isSkipSerialization: boolean;

  /**
   * undo, redoを行うための履歴
   */
  private _history: DataType[] = [];
  /**
   * 履歴配列の現在のインデックス
   */
  private _historyIndex = -1;
  /**
   * 履歴を使用するか否か
   */
  private _useHistory: boolean;

  constructor(options?: AtomContainerOptions) {
    super();
    this.isSkipSerialization = options?.isSkipSerialization ?? false;
    this._useHistory = options?.useHistory ?? false;
  }

  protected init() {
    this.addMembers();
    this.initHistory();
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

  protected initHistory() {
    if (!this._useHistory) {
      return;
    }

    this.on("addHistory", () => {
      this.addHistory();
    });
    this.addHistory();
  }

  public addHistory() {
    if (!this._useHistory) {
      return;
    }

    this._historyIndex++;
    this._history.splice(this._historyIndex);
    this._history.push(this.toObject());
  }

  public undo() {
    if (!this._useHistory || this._historyIndex <= 0) {
      return;
    }

    this._historyIndex--;
    this.fromObject(this._history[this._historyIndex]);
  }

  public redo() {
    if (!this._useHistory || this._historyIndex >= this._history.length - 1) {
      return;
    }

    this._historyIndex++;
    this.fromObject(this._history[this._historyIndex]);
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
