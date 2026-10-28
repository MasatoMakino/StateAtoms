import EventEmitter from "eventemitter3";
import { Atom } from "./Atom.js";
import type { AtomEventArgs } from "./AtomEventArgs.js";
import type { AtomEvents } from "./AtomEvents.js";
import { InitValidationHelper } from "./utils/InitValidationHelper.js";

/**
 * Modern configuration options for AtomContainer instances.
 * This is the preferred API that uses consistent naming conventions.
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
   * Whether to enable undo/redo functionality with manual history management.
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
 * @deprecated Use AtomContainerOptionsModern with skipSerialization instead
 * @since 0.1.0
 */
export type AtomContainerOptionsLegacy = {
  /**
   * Whether to exclude this container from serialization operations.
   *
   * @deprecated Use `skipSerialization` instead. This property will be removed in a future version.
   * @default false
   */
  isSkipSerialization?: boolean;

  /**
   * Whether to enable undo/redo functionality with manual history management.
   *
   * @default false
   */
  useHistory?: boolean;
};

/**
 * Configuration options for AtomContainer instances.
 *
 * Currently supports both modern and legacy APIs for backward compatibility.
 *
 * @since 0.1.0
 *
 * @remarks
 * **Migration Plan:**
 * - In a future major version, legacy support (AtomContainerOptionsLegacy) will be removed
 * - AtomContainerOptionsModern will be renamed to AtomContainerOptions
 * - This union type structure will be simplified to contain only the modern API
 *
 * **Recommended Usage:**
 * Use AtomContainerOptionsModern directly for new code to avoid future migration needs.
 */
export type AtomContainerOptions =
  | AtomContainerOptionsModern
  | AtomContainerOptionsLegacy;

/**
 * A class that holds multiple Atoms and AtomContainers and emits events when their values change.
 *
 * The AtomContainer provides hierarchical state management with automatic event propagation,
 * serialization capabilities, and optional undo/redo functionality. It automatically
 * discovers and manages child atoms and containers.
 *
 * @template DataType - The type of data this container holds when serialized
 * @template EventTypes - The type of events this container can emit. Defaults to
 *   `AtomEvents<unknown>` due to the dynamic nature of event bubbling where different
 *   atoms emit events with different specific types. For type safety, use explicit
 *   type specification in event handlers or consider custom EventTypes for additional
 *   type constraints.
 *
 * @example
 * ```typescript
 * // Basic usage patterns
 * class UserContainer extends AtomContainer<{name: string, age: number}> {
 *   name = new Atom("John");
 *   age = new Atom(30);
 *
 *   constructor() {
 *     super();
 *     this.connectMemberAtoms(); // Required after adding member atoms
 *
 *     // Pattern 1: Explicit type specification (Recommended)
 *     this.on("change", (args: AtomEventArgs<string>) => {
 *       if (args.from === this.name) {
 *         console.log(`Name changed: ${args.value.toUpperCase()}`);
 *       }
 *     });
 *   }
 * }
 *
 * // Pattern 2: Event source branching
 * const user = new UserContainer();
 * user.on("change", (args) => {
 *   if (args.from === user.name) {
 *     console.log(`Name: ${(args.value as string).length} chars`);
 *   } else if (args.from === user.age) {
 *     console.log(`Age: ${(args.value as number).toFixed(0)}`);
 *   }
 * });
 *
 * // Pattern 3: Runtime type guards
 * user.on("change", (args) => {
 *   if (typeof args.value === 'string') {
 *     console.log(`String value: ${args.value}`);
 *   } else if (typeof args.value === 'number') {
 *     console.log(`Number value: ${args.value}`);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Container with history support
 * const container = new AtomContainer({ useHistory: true });
 * container.undo(); // Undo last change
 * container.redo(); // Redo last undone change
 * ```
 *
 * ## Architecture & Design
 *
 * **Event Bubbling System**
 * AtomContainer uses a simple event bubbling mechanism where child atom events
 * are propagated unchanged to the container level. This provides consistent
 * hierarchical event flow with minimal performance overhead.
 *
 * **Type System Considerations**
 * Due to the dynamic nature of event bubbling, TypeScript's compile-time type
 * inference cannot accurately represent runtime behavior where different atoms
 * emit events with different specific types. The EventTypes parameter defaults
 * to `AtomEvents<unknown>` to acknowledge this limitation.
 *
 * **Why Manual connectMemberAtoms() is Required**
 * AtomContainer is designed for inheritance with member atoms that can be initialized
 * either as class fields or in constructors using parameters. Since it's impossible
 * to determine when all member atoms are properly initialized in inherited classes,
 * connectMemberAtoms() execution becomes the responsibility of the inheriting class to ensure:
 * - All member atoms are fully initialized (regardless of initialization pattern)
 * - Constructor parameters are processed
 * - Proper timing of event registration and history setup
 *
 * ```typescript
 * // Field initialization pattern
 * class FieldContainer extends AtomContainer<{count: number}> {
 *   count = new Atom(0);
 *   constructor() { super(); this.connectMemberAtoms(); }
 * }
 *
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
 * **Developer Experience Enhancement (v0.1.5+)**
 * AtomContainer includes automatic validation that warns developers when operations
 * are called before proper initialization. This provides helpful developer feedback
 * while maintaining full backward compatibility with zero breaking changes.
 *
 * @since 0.1.0
 * @see {@link Atom} for individual state values
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
   * History array for undo/redo operations.
   * Snapshots include members marked with skipSerialization, so their shape
   * can differ from DataType.
   *
   * @private
   */
  private _history: Record<string, unknown>[] = [];

  /**
   * Current index in the history array.
   *
   * @private
   */
  private _historyIndex = -1;

  /**
   * Whether history tracking is enabled.
   *
   * @private
   */
  private _useHistory: boolean;

  private _maxHistory: number;

  /**
   * Nesting depth of running history operations.
   * Only the outermost operation emits historyChange.
   *
   * @private
   */
  private _historyOperationDepth = 0;

  /**
   * Event listener function for beforeChange events.
   *
   * @private
   */
  private _beforeChangeListener = (arg: AtomEventArgs<unknown>) => {
    this.emit("beforeChange", arg);
  };

  /**
   * Event listener function for change events.
   *
   * @private
   */
  private _changeListener = (arg: AtomEventArgs<unknown>) => {
    this.emit("change", arg);
  };

  /**
   * Event listener function for addHistory events.
   *
   * @private
   */
  private _addHistoryListener = () => {
    this.emit("addHistory");
  };

  /**
   * Helper for validating container initialization and providing developer warnings.
   * Tracks whether connectMemberAtoms() has been called and prevents duplicate warning messages.
   *
   * @private
   */
  private readonly _initValidator = new InitValidationHelper(
    this.constructor.name,
  );

  /**
   * Creates a new AtomContainer instance.
   *
   * **Important**: After creating the instance and initializing member atoms, you must call `this.connectMemberAtoms()`
   * in your constructor to properly initialize the container.
   *
   * **Validation**: If you forget to call `connectMemberAtoms()`, the container will show helpful console warnings
   * when you attempt to use operations that require initialization (like `fromObject`, `addHistory`, etc.).
   * This validation helps catch common initialization issues during development.
   *
   * @param options - Configuration options
   *
   * @throws {RangeError} If `maxHistory` is not a positive integer or
   * `Infinity`
   */
  constructor(options?: AtomContainerOptionsModern);

  /**
   * Creates a new AtomContainer instance with legacy options.
   *
   * @deprecated Use the constructor with AtomContainerOptionsModern instead
   * @param options - Legacy configuration options
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
   * Determines whether this container should be excluded from serialization
   * operations like toJson() and toObject().
   *
   * @deprecated Use `skipSerialization` instead. This property will be removed in a future version.
   * @default false
   */
  get isSkipSerialization(): boolean {
    return this.skipSerialization;
  }

  /**
   * Connects member atoms and containers to the event bubbling system.
   *
   * This method discovers all Atom and AtomContainer members and registers them
   * for event propagation. Events from member atoms/containers will bubble up
   * through the container hierarchy.
   *
   * **This method is required and must be called in the constructor after all member atoms are added.**
   * The method is idempotent - it can be safely called multiple times without side effects.
   *
   * Failure to call this method will result in:
   * - Member atoms not being discovered or registered for event propagation
   * - History functionality not being initialized (if enabled)
   * - Console warnings when using operations that require initialization
   * - Potential runtime errors when attempting to use container operations
   *
   * @public
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
   * Initializes the container by adding member atoms/containers and setting up history.
   *
   * @deprecated Use connectMemberAtoms() instead. This method will be removed in v1.0.0.
   *
   * **Renaming Background (v0.2.0):**
   * The method name `init()` was ambiguous and caused developer confusion about what
   * exactly was being initialized. The new name `connectMemberAtoms()` clearly indicates
   * that this method discovers member atoms/containers and connects them to the event
   * bubbling system. This renaming improves code self-documentation and developer experience.
   * The old `init()` method is kept for backward compatibility during the transition period.
   *
   * @protected
   *
   * @example
   * ```typescript
   * class MyContainer extends AtomContainer {
   *   myAtom = new Atom("initial");
   *
   *   constructor() {
   *     super();
   *     this.init(); // Required - must be called after member atoms are added
   *   }
   * }
   * ```
   */
  protected init() {
    this.connectMemberAtoms();
  }

  /**
   * Automatically discovers and adds event listeners to all Atom and AtomContainer members.
   * Events from child atoms/containers are propagated up to the root container.
   *
   * @protected
   */
  protected addMembers() {
    for (const value of Object.values(this)) {
      if (value instanceof Atom || value instanceof AtomContainer) {
        this.add(value);
      }
    }
  }

  /**
   * Adds event listeners to propagate events from child atoms/containers.
   * This method is idempotent - it safely handles multiple calls for the same value.
   *
   * @param value - The atom or container to add event listeners to
   * @private
   */
  private add(value: Atom<unknown> | AtomContainer) {
    // Check if our specific listeners are already registered
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

  /**
   * History listener function for manual history management.
   *
   * @private
   */
  private _historyListener = () => {
    this.addHistory();
  };

  /**
   * Initializes manual history management if enabled.
   * Sets up manual history management on addHistory events.
   * This method is idempotent - it safely handles multiple calls.
   *
   * @protected
   */
  protected initHistory() {
    if (!this._useHistory) {
      return;
    }

    // Check if history listener is already registered
    const addHistoryListeners = this.listeners("addHistory");
    if (!addHistoryListeners.includes(this._historyListener)) {
      this.on("addHistory", this._historyListener);
      this.addHistory(); // Only add initial history if we just registered the listener
    }
  }

  /**
   * Adds the current state to the history stack.
   * This method is called when addHistory events are emitted.
   *
   * The snapshot includes atoms and containers marked with skipSerialization,
   * and it does not use toObject(). A subclass that overrides toObject()
   * does not change the snapshot. The snapshot holds references to atom
   * values, not copies.
   * When the history exceeds `maxHistory`, this method discards the oldest
   * snapshot.
   *
   * @example
   * ```typescript
   * container.addHistory(); // Manually add current state to history
   * ```
   */
  public addHistory() {
    this._initValidator.validateInitialized("addHistory");
    if (!this._useHistory) {
      return;
    }

    this.trackHistoryChange(() => {
      this._historyIndex++;
      this._history.splice(this._historyIndex);
      this._history.push(this.createHistorySnapshot());
      if (this._history.length > this._maxHistory) {
        this._history.shift();
        this._historyIndex--;
      }
    });
  }

  /**
   * Copies the values of all member Atoms and AtomContainers, including
   * those marked with skipSerialization, for the history stack.
   *
   * @private
   */
  private createHistorySnapshot(): Record<string, unknown> {
    const obj = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(this)) {
      if (value instanceof AtomContainer) {
        obj[key] = value.createHistorySnapshot();
      } else if (value instanceof Atom) {
        obj[key] = value.value;
      }
    }
    return obj;
  }

  /**
   * Returns whether undo() can restore a previous state.
   * The result is computed from the history position on each call.
   *
   * @returns `false` when history tracking is disabled or no previous state exists
   *
   * @example
   * ```typescript
   * undoButton.disabled = !container.canUndo();
   * ```
   *
   * @since 0.2.3
   */
  public canUndo(): boolean {
    return this._useHistory && this._historyIndex > 0;
  }

  /**
   * Returns whether redo() can restore a next state.
   * The result is computed from the history position on each call.
   *
   * @returns `false` when history tracking is disabled or no next state exists
   *
   * @example
   * ```typescript
   * redoButton.disabled = !container.canRedo();
   * ```
   *
   * @since 0.2.3
   */
  public canRedo(): boolean {
    return this._useHistory && this._historyIndex < this._history.length - 1;
  }

  /**
   * Runs a history operation and emits historyChange once when the history
   * index or the history length differs after the outermost operation.
   *
   * @private
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
   * Undoes the last change by restoring the previous state from history.
   * Does nothing when canUndo() returns false.
   * The restore includes atoms and containers marked with skipSerialization.
   *
   * @example
   * ```typescript
   * container.undo(); // Restore previous state
   * ```
   */
  public undo() {
    this._initValidator.validateInitialized("undo");
    if (!this.canUndo()) {
      return;
    }

    this.trackHistoryChange(() => {
      this._historyIndex--;
      this.restoreHistorySnapshot();
    });
  }

  /**
   * Redoes the last undone change by restoring the next state from history.
   * Does nothing when canRedo() returns false.
   * The restore includes atoms and containers marked with skipSerialization.
   *
   * @example
   * ```typescript
   * container.redo(); // Restore next state
   * ```
   */
  public redo() {
    this._initValidator.validateInitialized("redo");
    if (!this.canRedo()) {
      return;
    }

    this.trackHistoryChange(() => {
      this._historyIndex++;
      this.restoreHistorySnapshot();
    });
  }

  /**
   * Restores the history snapshot at the current history index.
   *
   * @private
   */
  private restoreHistorySnapshot() {
    // Snapshots hold skipSerialization members outside DataType. fromObject
    // restores every key that matches a member, so the cast loses no data.
    // Restoring through fromObject keeps subclass overrides in effect.
    this.fromObject(this._history[this._historyIndex] as DataType);
  }

  /**
   * Copies the values of all Atoms and AtomContainers held in this class to a plain object.
   * Atoms and containers marked with skipSerialization are excluded.
   * History snapshots do not use this method.
   *
   * @returns A plain object containing the serialized state
   *
   * @example
   * ```typescript
   * const state = container.toObject();
   * console.log(state); // { name: "John", age: 30 }
   * ```
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
   * Converts the values of all Atoms and AtomContainers held in this class to a JSON string.
   *
   * @returns A JSON string representation of the serialized state
   *
   * @example
   * ```typescript
   * const json = container.toJson();
   * console.log(json); // '{"name":"John","age":30}'
   * ```
   */
  toJson(): string {
    const obj = this.toObject();
    return JSON.stringify(obj);
  }

  /**
   * Restores the values of Atoms and AtomContainers from a plain object.
   * Only existing atoms and containers are updated; new properties are ignored.
   * Keys absent from obj leave their atoms unchanged, at every nesting level.
   * A key that holds undefined assigns undefined to its atom. The parameter
   * type rejects `undefined` for an atom or a nested container whose type
   * excludes it only when your tsconfig enables `exactOptionalPropertyTypes`.
   * An atom, including ObjectAtom, receives the whole value for its key.
   * Atoms and containers marked with skipSerialization are restored.
   * Class fields that are not Atoms or AtomContainers are never written.
   *
   * @param obj - The object containing the state to restore
   *
   * @throws {TypeError} If a key of a nested container holds `undefined` or
   * `null`
   *
   * @example
   * ```typescript
   * container.fromObject({ name: "Jane", age: 25 });
   * ```
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
   * Restores the values of Atoms and AtomContainers from a JSON string.
   * Applies the same rules as fromObject() to the parsed object.
   *
   * @param json - The JSON string to parse and restore from
   *
   * @throws {SyntaxError} If the JSON string is invalid
   *
   * @warning Invalid JSON strings will throw a SyntaxError. Consider wrapping
   * this method in a try-catch block when handling user input or external data.
   *
   * @example
   * ```typescript
   * container.fromJson('{"name":"Jane","age":25}');
   * ```
   */
  fromJson(json: string): void {
    this._initValidator.validateInitialized("fromJson");
    const jsonObj = JSON.parse(json);
    this.fromObject(jsonObj);
  }

  /**
   * Loads data into the container.
   * Applies the same rules as fromObject() to obj.
   * If history tracking is enabled, clears the history and starts fresh.
   * Emits historyChange once when the history index or length differs from
   * the state before the call.
   * The first history entry records skipSerialization members.
   *
   * @param obj - The data to load
   *
   * @example
   * ```typescript
   * container.load({ name: "Jane", age: 25 });
   * // History is cleared and new state becomes the first history entry
   * ```
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
