import EventEmitter from "eventemitter3";
import { Atom } from "./Atom.js";
import type { AtomEventArgs } from "./AtomEventArgs.js";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * Modern configuration options for AtomContainer instances.
 * This is the preferred API that uses consistent naming conventions.
 *
 * @since 0.1.0
 */
export type AtomContainerOptionsModern = {
  /**
   * Whether to exclude this container from serialization operations.
   *
   * @default false
   */
  skipSerialization?: boolean;

  /**
   * Whether to enable undo/redo functionality with automatic history tracking.
   *
   * @default false
   */
  useHistory?: boolean;
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
   * Whether to enable undo/redo functionality with automatic history tracking.
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
 * @template EventTypes - The type of events this container can emit. When omitted,
 *   EventTypes will be automatically inferred from DataType structure, providing
 *   enhanced type safety for event handlers. You can also explicitly specify custom
 *   event types, but this may cause listener arguments to be interpreted as 'any'.
 *   Instead, consider having an EventEmitter member variable for custom events.
 *
 * @example
 * ```typescript
 * // Basic usage with automatic type inference
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
 * // Event handlers now have inferred types: AtomEventArgs<string | number>
 * user.on("change", (args) => {
 *   console.log(`Value changed from ${args.valueFrom} to ${args.value}`);
 *   // args.value is typed as string | number
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
 * ## Design Background
 *
 * **Event Bubbling Architecture**
 * AtomContainer uses a simple event bubbling mechanism where child atom events
 * are propagated unchanged to the container level. This design provides:
 * - Consistent hierarchical event flow
 * - Minimal performance overhead
 * - Simple implementation and maintenance
 *
 * **Type System Limitations**
 * Due to the dynamic nature of event bubbling, TypeScript's compile-time type
 * inference cannot accurately represent the runtime behavior where different
 * atoms emit events with different specific types. The EventTypes parameter
 * defaults to `AtomEvents<unknown>` to acknowledge this limitation.
 *
 * ## Event Listener Best Practices
 *
 * **Pattern 1: Explicit Type Specification (Recommended)**
 * ```typescript
 * class UserContainer extends AtomContainer<{name: string, age: number}> {
 *   name = new Atom("");
 *   age = new Atom(0);
 *
 *   constructor() {
 *     super();
 *     this.init();
 *
 *     // Handle specific atom types explicitly
 *     this.on("change", (args: AtomEventArgs<string>) => {
 *       if (args.from === this.name) {
 *         console.log(`Name changed: ${args.value.toUpperCase()}`);
 *       }
 *     });
 *   }
 * }
 * ```
 *
 * **Pattern 2: Event Source Branching**
 * ```typescript
 * container.on("change", (args) => {
 *   if (args.from === container.countAtom) {
 *     // Handle as number
 *     console.log(`Count: ${(args.value as number).toFixed(0)}`);
 *   } else if (args.from === container.nameAtom) {
 *     // Handle as string
 *     console.log(`Name: ${(args.value as string).length} chars`);
 *   }
 * });
 * ```
 *
 * **Pattern 3: Runtime Type Guards**
 * ```typescript
 * container.on("change", (args) => {
 *   if (typeof args.value === 'number') {
 *     console.log(`Number: ${args.value.toFixed(2)}`);
 *   } else if (typeof args.value === 'string') {
 *     console.log(`String: "${args.value}"`);
 *   }
 * });
 * ```
 *
 * **Important Notes:**
 * - Event handlers receive the exact `AtomEventArgs<T>` from the originating atom
 * - Multiple atoms with different types will trigger separate events
 * - Runtime type checking or explicit type specification is recommended
 * - The `EventTypes` parameter can be customized for additional type safety
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
  readonly skipSerialization: boolean;

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
    this._useHistory = options?.useHistory ?? false;
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
   * Atoms and containers marked with skipSerialization are excluded.
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
