# StateAtoms

A lightweight state management library for TypeScript that divides application state into small, reactive units called "Atoms". StateAtoms provides event-driven state management with serialization capabilities and optional undo/redo functionality.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)
[![test](https://github.com/MasatoMakino/StateAtoms/actions/workflows/ci.yml/badge.svg)](https://github.com/MasatoMakino/StateAtoms/actions/workflows/ci.yml)

## Features

- **Reactive State Management**: Automatic change detection and event emission
- **Hierarchical Containers**: Organize atoms into containers with event propagation
- **Deep Equality Support**: ObjectAtom with intelligent change detection for complex objects
- **Serialization**: Built-in JSON serialization and deserialization
- **History Management**: Optional undo/redo functionality
- **TypeScript Support**: Full type safety with explicit event type specification
- **Lightweight**: Minimal dependencies (eventemitter3, fast-equals)

## Overview

StateAtoms divides state into small units called Atoms, which can be combined into containers to represent complex application state. This modular approach makes it easy to manage and monitor state changes with fine-grained control.

## Installation

You can install StateAtoms using npm. Run the following command:

```
npm install @masatomakino/state-atoms
```

## Usage

### Basic Atom

To use StateAtoms, first import the necessary modules:

```typescript
import { Atom } from "@masatomakino/state-atoms";
```

Create an atom with an initial value (type is automatically inferred):

```typescript
const countAtom = new Atom(0); // Type: Atom<number>
const nameAtom = new Atom("John"); // Type: Atom<string>
```

Update the atom value:

```typescript
countAtom.value = 1; // Triggers change events
countAtom.value = 1; // No events (same value)
```

Listen for changes:

```typescript
countAtom.on("change", (args) => {
  console.log(`Value changed: ${args.valueFrom} -> ${args.value}`);
});

countAtom.on("beforeChange", (args) => {
  console.log(`About to change: ${args.valueFrom} -> ${args.value}`);
});
```

### ObjectAtom for Complex Data

For objects that require deep equality comparison, use `ObjectAtom`:

```typescript
import { ObjectAtom } from "@masatomakino/state-atoms";

interface User {
  name: string;
  age: number;
}

const userAtom = new ObjectAtom<User>({ name: "John", age: 30 });

// This will NOT trigger an event (structurally identical)
userAtom.value = { name: "John", age: 30 };

// This WILL trigger an event (different values)
userAtom.value = { name: "Jane", age: 25 };
```

`ObjectAtom` is for a value that changes as a whole, such as coordinates or a color. For data that changes field by field, nest containers whose leaf atoms hold primitive values.

To change an object value in an `ObjectAtom` or an `Atom`, assign a new object. Treat the object that `value` returns as read-only:

```typescript
// Correct: assign a new object through the setter
userAtom.value = { ...userAtom.value, name: "Bob" };

// Wrong: the setter does not run, so no event fires and history snapshots change too
userAtom.value.name = "Bob";
```

### AtomContainer for State Management

AtomContainer manages multiple atoms with automatic event propagation:

```typescript
import { AtomContainer, Atom, ObjectAtom } from "@masatomakino/state-atoms";

interface AppState {
  user: { name: string; age: number };
  count: number;
  settings: { theme: string };
}

class AppContainer extends AtomContainer<AppState> {
  user = new ObjectAtom({ name: "John", age: 30 });
  count = new Atom(0);
  settings = new ObjectAtom({ theme: "light" });

  constructor() {
    super();
    this.connectMemberAtoms(); // Required after adding member atoms
  }
}
```

Use the container:

```typescript
const app = new AppContainer();

// Listen to all changes in the container
// Use explicit type specification for type safety
app.on("change", (args) => {
  console.log(`Changed: ${args.from.constructor.name}`);
  console.log(`Value: ${args.valueFrom} -> ${args.value}`);
  
  // Recommended: Use explicit typing or type guards
  if (args.from === app.count) {
    console.log(`Count changed to: ${args.value as number}`);
  }
});

// Changes to any atom trigger container events
app.count.value = 5;
app.user.value = { name: "Jane", age: 25 };
```

### Serialization and State Persistence

```typescript
// Serialize to JSON
const stateJson = app.toJson();
console.log(stateJson); // '{"user":{"name":"Jane","age":25},"count":5,"settings":{"theme":"light"}}'

// Serialize to object
const stateObj = app.toObject();

// Restore from data
app.fromObject({
  user: { name: "Bob", age: 40 },
  count: 10,
  settings: { theme: "dark" },
});

// fromObject, fromJson, and load accept data that contains only some of the keys.
// Atoms whose keys are absent keep their current values, at every nesting level.
app.fromObject({ count: 15 });

// An ObjectAtom holds one value, so the object replaces the whole value:
// user becomes { name: "Ann" }, without age.
app.fromJson('{"user":{"name":"Ann"}}');
```

A key that holds `undefined` assigns `undefined` to its atom. The parameter type of `fromObject()` rejects `{ count: undefined }` for `Atom<number>` only when your tsconfig enables `exactOptionalPropertyTypes`.

The type check lets you omit top-level keys, not keys inside a nested container. To restore part of a nested container, call `fromObject()` on that container.

### History and Undo/Redo

StateAtoms uses manual history management to provide optimal user experience. History snapshots are created at meaningful interaction boundaries, not on every value change.

```typescript
class HistoryContainer extends AtomContainer<{ count: number }> {
  count = new Atom(0);

  constructor() {
    super({ useHistory: true }); // Enable history tracking
    this.connectMemberAtoms();
  }
}

const container = new HistoryContainer();

// Manual history management for meaningful undo points
container.count.value = 1;
container.count.emit('addHistory'); // Save meaningful state

container.count.value = 2;
container.count.emit('addHistory'); // Save another meaningful state

container.count.value = 3;
container.count.emit('addHistory'); // Save final state

console.log(container.count.value); // 3

container.undo();
console.log(container.count.value); // 2

container.undo();
console.log(container.count.value); // 1

container.redo();
console.log(container.count.value); // 2
```

`canUndo()` and `canRedo()` return whether `undo()` and `redo()` can move through history. The container emits `historyChange` after the history index or length changes, so UI can update its buttons there:

```typescript
container.on("historyChange", () => {
  undoButton.disabled = !container.canUndo();
  redoButton.disabled = !container.canRedo();
});
```

Child containers do not propagate `historyChange` to their parent, because each container keeps its own history.

History snapshots hold references to atom values, so an in-place change to an object value also changes recorded history. See [ObjectAtom for Complex Data](#objectatom-for-complex-data).

**Why Manual History?**
Manual `addHistory` events allow applications to control when meaningful snapshots are created, resulting in intuitive undo/redo behavior that matches user expectations. For comprehensive UI integration patterns, see [UI Integration Patterns for History Management](docs/ui-integration-patterns.md).

### Advanced Configuration

`skipSerialization` marks temporary state that the server does not need, such as screen transition state. A container treats these members as follows:

- `toObject()` and `toJson()` exclude them.
- `fromObject()`, `fromJson()`, and `load()` restore them, so the server can supply initial values.
- History records them, and `undo()` and `redo()` restore them.

`skipSerialization` is not a security feature.

```typescript
class AppContainerWithRuntimeState extends AtomContainer<{
  userSettings: { theme: string; language: string };
}> {
  // Sent to the server, restored, and undoable
  userSettings = new ObjectAtom({ theme: "light", language: "en" });

  // Not sent to the server, but restored and undoable
  currentPage = new Atom("home", { skipSerialization: true });

  // Outside the container's scope: never serialized, restored, or recorded in history
  authToken = "";

  constructor() {
    super({ useHistory: true });
    this.connectMemberAtoms();
  }
}
```

Some values need none of serialization, restore, and history. Examples are credentials, loading flags, and UI state that undo must not change. These values are outside the container's scope. Hold them as plain fields or in your UI framework's state. A container reads and writes only its `Atom` and `AtomContainer` members, so `fromJson()` cannot overwrite a plain field.

### Disposing State

`dispose()` prevents memory leaks. A container adds listeners to its member atoms, so a member atom keeps a reference to the container. When you discard state, call `dispose()` on the root container so that the garbage collector can free the whole tree.

A container owns its members. `dispose()` on a container does the following:

- Calls `dispose()` on every member `Atom` and `AtomContainer` at every nesting level, including members marked with `skipSerialization`.
- Removes every listener on each member and on the container itself, including listeners that your UI code added.

```typescript
const state = new AppContainerWithRuntimeState();
state.on("change", render);

// Discard the state when the screen closes
state.dispose();
```

`dispose()` destroys sharing. A shared atom or container loses the listeners of its other containers and UI code. This is the designed behavior. After `dispose()`, discard the container and its members.

#### Replacing a member atom

A container does not support replacing a member atom with another atom instance. To change state, assign a new value to the existing atom. `dispose()` reaches only the members that the container holds when you call it. A replaced atom keeps the listeners of the container and keeps the container alive.

If you must replace a member atom, dispose the old atom yourself before the assignment. Then call `connectMemberAtoms()` to connect the new atom.

```typescript
// Preferred: change the value
container.count.value = 5;

// Replacement is outside the design: dispose the old atom first
container.count.dispose();
container.count = new Atom(5);
container.connectMemberAtoms();
```

## API Reference

### Atom\<T>

Holds primitive values with change notifications.

- `constructor(initialValue: T, options?)`: Create a new atom
- `value: T`: Get/set the current value
- `skipSerialization: boolean`: Whether a container excludes this atom from `toObject()` and `toJson()`. Restore and history include it (default: `false`)
- `dispose()`: Remove every listener on this atom, including listeners of other containers that share it

**Events:**
- `change`: Emitted when value changes
- `beforeChange`: Emitted before value changes

### ObjectAtom\<T>

Extends Atom with deep equality comparison for objects.

- Uses `fast-equals` for structural comparison
- Same API as Atom but with smarter change detection

### AtomContainer\<DataType, EventTypes?>

Manages multiple atoms with hierarchical event propagation and explicit event type handling.

**Type Parameters:**
- `DataType`: The structure of data when serialized (e.g., `{ count: number; name: string }`)
- `EventTypes`: Event types (defaults to `AtomEvents<unknown>` for maximum flexibility)

**Event Type Handling:**
EventTypes defaults to `AtomEvents<unknown>` due to the dynamic nature of event bubbling. For type safety, use explicit type specification in event handlers or type guards to handle different atom types appropriately.

**Methods:**
- `constructor(options?)`: Create container with optional history
- `toObject()`: Serialize to plain object
- `toJson()`: Serialize to JSON string
- `fromObject(obj)`: Restore from object
- `fromJson(json)`: Restore from JSON
- `load(obj)`: Load data and reset history
- `undo()`: Undo last change (if history enabled)
- `redo()`: Redo last undone change (if history enabled)
- `canUndo()`: Whether `undo()` can restore a previous state
- `canRedo()`: Whether `redo()` can restore a next state
- `addHistory()`: Manually add current state to history
- `dispose()`: Dispose this container and all nested members to prevent memory leaks. See [Disposing State](#disposing-state)

**Events:**
- `change`: Propagated from child atoms/containers (typed based on DataType)
- `beforeChange`: Propagated from child atoms/containers (typed based on DataType)
- `addHistory`: Emitted when history entry is added
- `historyChange`: Emitted after the history index or length changes. Not propagated to parent containers

**Event Handling Examples:**
```typescript
// Recommended: Explicit type specification in event handlers
class MyContainer extends AtomContainer<{ count: number; active: boolean }> {
  count = new Atom(0);
  active = new Atom(false);
  
  constructor() {
    super();
    this.connectMemberAtoms();
    
    // Pattern 1: Explicit type specification
    this.on("change", (args: AtomEventArgs<number>) => {
      if (args.from === this.count) {
        console.log(`Count: ${args.value}`);
      }
    });
    
    // Pattern 2: Type guards
    this.on("change", (args) => {
      if (typeof args.value === 'number') {
        console.log(`Number value: ${args.value}`);
      }
    });
  }
}

// Custom events with explicit EventTypes
interface CustomEvents extends AtomEvents<unknown> {
  customEvent: (data: string) => void;
}
class CustomContainer extends AtomContainer<{ count: number; active: boolean }, CustomEvents> {
  // Custom event types with explicit specification
}
```

## Development

### Building
```bash
npm run build
```

### Testing  
```bash
npm test          # Run all tests
npm run coverage  # Run tests with coverage
```

### Code Quality
```bash
npx biome check   # Lint and format check
npx biome format  # Format code
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.