import EventEmitter from "eventemitter3";
import { Atom } from "./Atom.js";
import type { AtomEventArgs } from "./AtomEventArgs.js";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * Configuration options for AtomContainer instances.
 *
 * @since 0.1.0
 */
export type AtomContainerOptions = {
  /**
   * Whether to exclude this container from serialization operations.
   *
   * @default false
   */
  isSkipSerialization?: boolean;

  /**
   * Whether to enable undo/redo functionality with automatic history tracking.
   *
   * @default false
   */
  useHistory?: boolean;
};

/**
 * A class that holds multiple Atoms and AtomContainers and emits events when their values change.
 *
 * The AtomContainer provides hierarchical state management with automatic event propagation,
 * serialization capabilities, and optional undo/redo functionality. It automatically
 * discovers and manages child atoms and containers.
 *
 * @template DataType - The type of data this container holds when serialized
 * @template EventTypes - The type of events this container can emit
 *   You can extend the event types, but this may cause listener arguments to be interpreted as 'any'.
 *   Instead, consider having an EventEmitter member variable for custom events.
 *
 * @example
 * ```typescript
 * class UserContainer extends AtomContainer<{name: string, age: number}> {
 *   name = new Atom("John");
 *   age = new Atom(30);
 *
 *   constructor() {
 *     super();
 *     this.init(); // Required after adding member atoms
 *   }
 * }
 *
 * const user = new UserContainer();
 * user.on("change", (args) => {
 *   console.log("User data changed:", args);
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
 * @since 0.1.0
 * @see {@link Atom} for individual state values
 * @see {@link AtomContainerOptions} for configuration options
 */
export class AtomContainer<
  DataType = unknown,
  EventTypes extends AtomEvents<unknown> = AtomEvents<unknown>,
> extends EventEmitter<EventTypes | AtomEvents<unknown>> {
  /**
   * Determines whether this container should be excluded from serialization
   * operations like toJson() and toObject().
   *
   * @default false
   */
  readonly isSkipSerialization: boolean;

  /**
   * History array for undo/redo operations.
   *
   * @private
   */
  private _history: DataType[] = [];

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

  /**
   * Creates a new AtomContainer instance.
   *
   * @param options - Configuration options
   */
  constructor(options?: AtomContainerOptions) {
    super();
    this.isSkipSerialization = options?.isSkipSerialization ?? false;
    this._useHistory = options?.useHistory ?? false;
  }

  /**
   * Initializes the container by adding member atoms/containers and setting up history.
   * This method must be called in the constructor after all member atoms are added.
   *
   * @protected
   */
  protected init() {
    this.addMembers();
    this.initHistory();
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
   *
   * @param value - The atom or container to add event listeners to
   * @private
   */
  private add(value: Atom<unknown> | AtomContainer) {
    value.on("beforeChange", (arg: AtomEventArgs<unknown>) => {
      this.emit("beforeChange", arg);
    });
    value.on("change", (arg: AtomEventArgs<unknown>) => {
      this.emit("change", arg);
    });
    value.on("addHistory", () => {
      this.emit("addHistory");
    });
  }

  /**
   * Initializes history tracking if enabled.
   * Sets up automatic history recording on state changes.
   *
   * @protected
   */
  protected initHistory() {
    if (!this._useHistory) {
      return;
    }

    this.on("addHistory", () => {
      this.addHistory();
    });
    this.addHistory();
  }

  /**
   * Adds the current state to the history stack.
   * This method is called automatically when history tracking is enabled.
   *
   * @example
   * ```typescript
   * container.addHistory(); // Manually add current state to history
   * ```
   */
  public addHistory() {
    if (!this._useHistory) {
      return;
    }

    this._historyIndex++;
    this._history.splice(this._historyIndex);
    this._history.push(this.toObject());
  }

  /**
   * Undoes the last change by restoring the previous state from history.
   * Only works if history tracking is enabled.
   *
   * @example
   * ```typescript
   * container.undo(); // Restore previous state
   * ```
   */
  public undo() {
    if (!this._useHistory || this._historyIndex <= 0) {
      return;
    }

    this._historyIndex--;
    this.fromObject(this._history[this._historyIndex]);
  }

  /**
   * Redoes the last undone change by restoring the next state from history.
   * Only works if history tracking is enabled.
   *
   * @example
   * ```typescript
   * container.redo(); // Restore next state
   * ```
   */
  public redo() {
    if (!this._useHistory || this._historyIndex >= this._history.length - 1) {
      return;
    }

    this._historyIndex++;
    this.fromObject(this._history[this._historyIndex]);
  }

  /**
   * Copies the values of all Atoms and AtomContainers held in this class to a plain object.
   * Atoms and containers marked with isSkipSerialization are excluded.
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
      if (value instanceof AtomContainer && !value.isSkipSerialization) {
        obj[key] = value.toObject();
      } else if (value instanceof Atom && !value.isSkipSerialization) {
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
   *
   * @param obj - The object containing the state to restore
   *
   * @example
   * ```typescript
   * container.fromObject({ name: "Jane", age: 25 });
   * ```
   */
  fromObject(obj: DataType): void {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const member = (this as Record<typeof key, unknown>)[key];
      if (member instanceof AtomContainer) {
        member.fromObject(value);
      } else if (member instanceof Atom) {
        member.value = value;
      }
    }
  }

  /**
   * Restores the values of Atoms and AtomContainers from a JSON string.
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
    const jsonObj = JSON.parse(json);
    this.fromObject(jsonObj);
  }

  /**
   * Loads data into the container.
   * If history tracking is enabled, clears the history and starts fresh.
   *
   * @param obj - The data to load
   *
   * @example
   * ```typescript
   * container.load({ name: "Jane", age: 25 });
   * // History is cleared and new state becomes the first history entry
   * ```
   */
  load(obj: DataType) {
    if (this._useHistory) {
      this._history = [];
      this._historyIndex = -1;
    }
    this.fromObject(obj);
    this.addHistory();
  }
}
