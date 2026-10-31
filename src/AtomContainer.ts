import EventEmitter from "eventemitter3";
import { Atom } from "./Atom.js";
import type { AtomEventArgs } from "./AtomEventArgs.js";
import type { AtomEvents } from "./AtomEvents.js";
import { InitValidationHelper } from "./utils/InitValidationHelper.js";

/**
 * Changes from one history state to the next, as flat
 * `atom, valueFrom, value` triples to keep memory per entry small.
 */
type HistoryEntry = readonly unknown[];

/**
 * Configuration options for AtomContainer instances.
 *
 * @since 0.1.0
 */
export type AtomContainerOptionsModern = {
  /**
   * Whether to exclude this container from `toObject()` and `toJson()` output.
   *
   * A parent container restores this container through `fromObject()`,
   * `fromJson()`, and `load()`, and records it in history for `undo()`
   * and `redo()`. Use this for temporary state that the server does not need,
   * such as screen transition state. This option is not a security feature.
   *
   * @default false
   */
  skipSerialization?: boolean;

  /**
   * Whether to enable undo and redo with manual history management.
   *
   * To limit memory use, set `{ maxHistory }`. The container keeps at most
   * `maxHistory` history snapshots, including the initial state. `true` sets
   * no limit.
   * When a new snapshot exceeds the limit, the container discards the oldest
   * snapshot. The history index and length keep their values. In that case,
   * the container does not emit `historyChange`.
   *
   * @default false
   */
  useHistory?: boolean | { maxHistory: number };
};

/**
 * Legacy configuration options for AtomContainer instances.
 *
 * @deprecated Use `AtomContainerOptionsModern` instead.
 * @since 0.1.0
 */
export type AtomContainerOptionsLegacy = {
  /**
   * Whether to exclude this container from serialization operations.
   *
   * @deprecated Use `skipSerialization` instead.
   * @default false
   */
  isSkipSerialization?: boolean;

  /**
   * Whether to enable undo and redo with manual history management.
   *
   * @default false
   */
  useHistory?: boolean;
};

/**
 * Configuration options for AtomContainer instances. Accepts
 * `AtomContainerOptionsModern` and the deprecated `AtomContainerOptionsLegacy`.
 *
 * @since 0.1.0
 */
export type AtomContainerOptions =
  | AtomContainerOptionsModern
  | AtomContainerOptionsLegacy;

/**
 * Holds Atoms and AtomContainers as members and re-emits their
 * `beforeChange`, `change`, and `addHistory` events unchanged. It serializes
 * and restores member values, and provides undo and redo when history is
 * enabled.
 *
 * A subclass must call `connectMemberAtoms()` in its constructor after it
 * initializes every member. Members can come from class fields or from
 * constructor parameters, so the base class cannot detect when they are
 * ready. Before that call, operations such as `fromObject()` warn once
 * through `console.warn`.
 *
 * Public methods such as `fromObject()` are operations for callers. Do not
 * override them to change their behavior. To normalize input, normalize it
 * before you call the method.
 *
 * @template DataType - The type of data this container holds when serialized
 * @template EventTypes - The type of events this container can emit. The
 *   default is `AtomEvents<unknown>`, because members emit events with
 *   different value types. For type safety, annotate the handler argument,
 *   such as `AtomEventArgs<string>`, or pass a custom `EventTypes`.
 *
 * @example
 * ```typescript
 * class UserContainer extends AtomContainer<{name: string, age: number}> {
 *   name = new Atom("John");
 *   age = new Atom(30);
 *
 *   constructor() {
 *     super();
 *     this.connectMemberAtoms(); // Required after adding member atoms
 *
 *     this.on("change", (args: AtomEventArgs<string>) => {
 *       if (args.from === this.name) {
 *         console.log(`Name changed: ${args.value.toUpperCase()}`);
 *       }
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Constructor parameter pattern
 * class ParamContainer extends AtomContainer<{name: string}> {
 *   private name: Atom<string>;
 *   constructor(initialName: string) {
 *     super();
 *     this.name = new Atom(initialName);
 *     this.connectMemberAtoms(); // Required after member initialization
 *   }
 * }
 * ```
 *
 * @since 0.1.0
 * @see {@link AtomContainerOptions} for configuration options
 */
export class AtomContainer<
  DataType = unknown,
  EventTypes extends AtomEvents<unknown> = AtomEvents<unknown>,
> extends EventEmitter<EventTypes | AtomEvents<unknown>> {
  /**
   * Determines whether a parent container excludes this container from
   * `toObject()` and `toJson()` output. Restore and history include it.
   *
   * @default false
   * @see {@link AtomContainerOptionsModern.skipSerialization}
   */
  readonly skipSerialization: boolean;

  /**
   * Entry i holds the changes from history state i - 1 to state i. Entry 0
   * is never read, because undo cannot move before state 0. addHistory()
   * empties it to release references after it discards the oldest entry.
   */
  private _history: HistoryEntry[] = [];

  /**
   * Values at the current history state of the atoms written since then.
   */
  private _pendingChanges = new Map<Atom<unknown>, unknown>();

  private _historyIndex = -1;
  private _useHistory: boolean;
  private _maxHistory: number;

  /**
   * Nesting depth of running history operations.
   * Only the outermost operation emits historyChange.
   */
  private _historyOperationDepth = 0;

  private _beforeChangeListener = (arg: AtomEventArgs<unknown>) => {
    // Record before the write, so a listener that throws or writes again
    // cannot hide a change from history.
    if (this._useHistory && !this._pendingChanges.has(arg.from)) {
      this._pendingChanges.set(arg.from, arg.valueFrom);
    }
    this.emit("beforeChange", arg);
  };

  private _changeListener = (arg: AtomEventArgs<unknown>) => {
    this.emit("change", arg);
  };

  private _addHistoryListener = () => {
    this.emit("addHistory");
  };

  private readonly _initValidator = new InitValidationHelper(
    this.constructor.name,
  );

  /**
   * @throws {RangeError} If `maxHistory` is not a positive integer or
   * `Infinity`
   */
  constructor(options?: AtomContainerOptionsModern);

  /**
   * @deprecated Use the constructor with `AtomContainerOptionsModern` instead.
   */
  constructor(options?: AtomContainerOptionsLegacy);

  constructor(options?: AtomContainerOptions) {
    super();
    this.skipSerialization =
      (options as AtomContainerOptionsModern)?.skipSerialization ??
      (options as AtomContainerOptionsLegacy)?.isSkipSerialization ??
      false;
    const useHistory = options?.useHistory ?? false;
    this._useHistory = useHistory !== false;
    this._maxHistory =
      typeof useHistory === "object" ? useHistory.maxHistory : Infinity;
    if (
      this._maxHistory !== Infinity &&
      !(Number.isInteger(this._maxHistory) && this._maxHistory >= 1)
    ) {
      throw new RangeError(
        `maxHistory must be a positive integer or Infinity: ${this._maxHistory}`,
      );
    }
  }

  /**
   * @deprecated Use `skipSerialization` instead.
   */
  get isSkipSerialization(): boolean {
    return this.skipSerialization;
  }

  /**
   * Registers every Atom and AtomContainer member so that the container
   * re-emits their events, then records the initial history entry if history
   * is enabled. Call it in the constructor after you initialize every member.
   * Later calls do not register a member twice or add another initial entry.
   *
   * Without this call, member events do not reach the container, so history
   * records no member changes. Operations such as `fromObject()` warn once.
   *
   * @since 0.2.0
   *
   * @example
   * ```typescript
   * class MyContainer extends AtomContainer {
   *   myAtom = new Atom("initial");
   *
   *   constructor() {
   *     super();
   *     this.connectMemberAtoms(); // Required - must be called after member atoms are added
   *   }
   * }
   * ```
   */
  public connectMemberAtoms(): void {
    this._initValidator.markInitialized();
    this.addMembers();
    this.initHistory();
  }

  /**
   * @deprecated Use `connectMemberAtoms()` instead.
   */
  protected init() {
    this.connectMemberAtoms();
  }

  /**
   * Registers every Atom and AtomContainer member for event re-emission.
   */
  protected addMembers() {
    for (const value of Object.values(this)) {
      if (value instanceof Atom || value instanceof AtomContainer) {
        this.add(value);
      }
    }
  }

  private add(value: Atom<unknown> | AtomContainer) {
    const beforeChangeListeners = value.listeners("beforeChange");
    const changeListeners = value.listeners("change");
    const addHistoryListeners = value.listeners("addHistory");

    if (!beforeChangeListeners.includes(this._beforeChangeListener)) {
      value.on("beforeChange", this._beforeChangeListener);
    }

    if (!changeListeners.includes(this._changeListener)) {
      value.on("change", this._changeListener);
    }

    if (!addHistoryListeners.includes(this._addHistoryListener)) {
      value.on("addHistory", this._addHistoryListener);
    }
  }

  private _historyListener = () => {
    this.addHistory();
  };

  /**
   * Starts history if it is enabled: listens for `addHistory` and records
   * the initial entry. Later calls do nothing.
   */
  protected initHistory() {
    if (!this._useHistory) {
      return;
    }

    const addHistoryListeners = this.listeners("addHistory");
    if (!addHistoryListeners.includes(this._historyListener)) {
      this.on("addHistory", this._historyListener);
      this.addHistory();
    }
  }

  /**
   * Adds the current state to the history stack. The container calls this
   * method when it receives `addHistory`.
   *
   * The snapshot records the atoms written since the last `addHistory()`,
   * `undo()`, or `redo()` call, including members marked with
   * skipSerialization at every nesting level. Its memory use and time grow
   * with the number of written atoms, not with the number of members. A call
   * without changes still adds a snapshot. The snapshot holds references to
   * atom values, not copies.
   * When the history exceeds `maxHistory`, this method discards the oldest
   * snapshot.
   */
  public addHistory() {
    this._initValidator.validateInitialized("addHistory");
    if (!this._useHistory) {
      return;
    }

    this.trackHistoryChange(() => {
      this._historyIndex++;
      this._history.splice(this._historyIndex);
      const changes: unknown[] = [];
      for (const [atom, valueFrom] of this._pendingChanges) {
        if (atom.value !== valueFrom) {
          changes.push(atom, valueFrom, atom.value);
        }
      }
      this._history.push(changes);
      this._pendingChanges = new Map();
      if (this._history.length > this._maxHistory) {
        this._history.shift();
        this._historyIndex--;
      }
      this._history[0] = [];
    });
  }

  /**
   * Returns whether `undo()` can restore a previous state. It reads the
   * history position on each call.
   *
   * @returns `false` when history tracking is disabled or no previous state exists
   *
   * @since 0.2.3
   */
  public canUndo(): boolean {
    return this._useHistory && this._historyIndex > 0;
  }

  /**
   * Returns whether `redo()` can restore a next state. It reads the history
   * position on each call.
   *
   * @returns `false` when history tracking is disabled or no next state exists
   *
   * @since 0.2.3
   */
  public canRedo(): boolean {
    return this._useHistory && this._historyIndex < this._history.length - 1;
  }

  /**
   * Runs a history operation and emits historyChange once when the history
   * index or the history length differs after the outermost operation.
   */
  private trackHistoryChange(operation: () => void) {
    const index = this._historyIndex;
    const length = this._history.length;
    this._historyOperationDepth++;
    try {
      operation();
    } finally {
      // Restore the depth when a change listener throws, so later operations
      // still emit historyChange. The exception propagates to the caller.
      this._historyOperationDepth--;
    }
    if (
      this._historyOperationDepth === 0 &&
      (index !== this._historyIndex || length !== this._history.length)
    ) {
      this.emit("historyChange");
    }
  }

  /**
   * Restores the previous history state. Does nothing when `canUndo()`
   * returns `false`.
   * It also reverts changes that `addHistory()` has not recorded. The restore
   * includes atoms and containers marked with skipSerialization.
   * It sets atom values directly and does not call `fromObject()`. Each
   * restored atom emits at most one `change`.
   */
  public undo() {
    this._initValidator.validateInitialized("undo");
    if (!this.canUndo()) {
      return;
    }

    this.trackHistoryChange(() => {
      const changes = this._history[this._historyIndex];
      this._historyIndex--;
      this.restoreHistory(changes, "valueFrom");
    });
  }

  /**
   * Restores the next history state. Does nothing when `canRedo()` returns
   * `false`.
   * It also reverts changes that `addHistory()` has not recorded. The restore
   * includes atoms and containers marked with skipSerialization.
   * It sets atom values directly and does not call `fromObject()`. Each
   * restored atom emits at most one `change`.
   */
  public redo() {
    this._initValidator.validateInitialized("redo");
    if (!this.canRedo()) {
      return;
    }

    this.trackHistoryChange(() => {
      this._historyIndex++;
      this.restoreHistory(this._history[this._historyIndex], "value");
    });
  }

  /**
   * Reverts the pending changes, then applies one history entry.
   *
   * @param changes - The history entry to apply
   * @param side - `valueFrom` to undo the entry, `value` to redo it
   */
  private restoreHistory(changes: HistoryEntry, side: "valueFrom" | "value") {
    // Merge into one target per atom, so each atom emits at most one change.
    const targets = new Map(this._pendingChanges);
    const offset = side === "valueFrom" ? 1 : 2;
    for (let i = 0; i < changes.length; i += 3) {
      targets.set(changes[i] as Atom<unknown>, changes[i + offset]);
    }
    // Targets are the values at the new history state. Seeding them keeps
    // atoms that a throwing listener leaves unwritten in the pending changes.
    this._pendingChanges = new Map(targets);
    for (const [atom, value] of targets) {
      atom.value = value;
    }
  }

  /**
   * Copies the values of the Atom and AtomContainer members to a plain
   * object. It excludes members marked with skipSerialization.
   * History snapshots do not use this method.
   */
  toObject(): DataType {
    const obj = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(this)) {
      if (value instanceof AtomContainer && !value.skipSerialization) {
        obj[key] = value.toObject();
      } else if (value instanceof Atom && !value.skipSerialization) {
        obj[key] = value.value;
      }
    }
    return obj as DataType;
  }

  /**
   * Returns the result of `toObject()` as a JSON string.
   */
  toJson(): string {
    const obj = this.toObject();
    return JSON.stringify(obj);
  }

  /**
   * Restores the values of Atoms and AtomContainers from a plain object.
   * It updates only existing atoms and containers, and ignores unknown keys.
   * It does not check value types at run time.
   * Keys absent from obj leave their atoms unchanged, at every nesting level.
   * A key that holds undefined assigns undefined to its atom. The parameter
   * type rejects `undefined` for an atom or a nested container whose type
   * excludes it only when your tsconfig enables `exactOptionalPropertyTypes`.
   * An atom, including ObjectAtom, receives the whole value for its key.
   * It also restores members marked with skipSerialization.
   * It never writes class fields that are not Atoms or AtomContainers.
   *
   * @throws {TypeError} If a key of a nested container holds `undefined` or
   * `null`
   */
  fromObject(obj: Partial<DataType>): void {
    this._initValidator.validateInitialized("fromObject");
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const member = (this as Record<typeof key, unknown>)[key];
      if (member instanceof AtomContainer) {
        member.fromObject(value as Record<string, unknown>);
      } else if (member instanceof Atom) {
        member.value = value;
      }
    }
  }

  /**
   * Parses `json` and restores it with the same rules as `fromObject()`.
   *
   * @throws {SyntaxError} If the JSON string is invalid
   */
  fromJson(json: string): void {
    this._initValidator.validateInitialized("fromJson");
    const jsonObj = JSON.parse(json);
    this.fromObject(jsonObj);
  }

  /**
   * Restores obj with the same rules as `fromObject()`. If history tracking
   * is enabled, it clears the history and records the loaded state as the
   * first history entry.
   * Emits historyChange once when the history index or length differs from
   * the state before the call.
   */
  load(obj: Partial<DataType>) {
    this._initValidator.validateInitialized("load");
    this.trackHistoryChange(() => {
      if (this._useHistory) {
        this._history = [];
        this._historyIndex = -1;
      }
      this.fromObject(obj);
      this.addHistory();
    });
  }

  /**
   * Disposes this container and its members at every nesting level to
   * prevent memory leaks. Discard the container after `dispose()`.
   *
   * The container owns its members. `dispose()` also disposes each member
   * `Atom` and `AtomContainer`, including members marked with
   * `skipSerialization`. It removes every listener on this container,
   * including the listener of a parent container.
   *
   * A shared member loses the listeners of its other containers and UI code.
   * This is the designed behavior.
   *
   * `dispose()` reaches only the members that the container holds when you
   * call it. The container does not support replacing a member atom. If you
   * replace one, call `dispose()` on the old atom before the assignment and
   * `connectMemberAtoms()` after it.
   *
   * @since 0.3.1
   */
  dispose(): void {
    for (const value of Object.values(this)) {
      if (value instanceof Atom || value instanceof AtomContainer) {
        value.dispose();
      }
    }
    this.removeAllListeners();
  }
}
