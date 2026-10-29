# Keyed collections

This guide shows how to hold a key-value collection whose keys change at run time, such as keyframes on a timeline. StateAtoms has no dedicated map atom. Hold the collection in an `Atom<ReadonlyMap<K, V>>` and assign a new map for each change.

If you know every key at design time, use a container with one atom per key instead. That container emits a separate event and records separate history for each key. For more information, see [AtomContainer for State Management](../README.md#atomcontainer-for-state-management).

## Update a map

To change the collection, create a new map from the current value and assign it. The `ReadonlyMap` type rejects `set()`, `delete()`, and `clear()` on the value that `value` returns.

```typescript
import { Atom } from "@masatomakino/state-atoms";

interface Keyframe {
  x: number;
  y: number;
}

const keyframes = new Atom<ReadonlyMap<number, Keyframe>>(new Map());

function setKeyframe(time: number, keyframe: Keyframe) {
  keyframes.value = new Map(keyframes.value).set(time, keyframe);
}

function deleteKeyframe(time: number) {
  if (!keyframes.value.has(time)) {
    return;
  }
  const next = new Map(keyframes.value);
  next.delete(time);
  keyframes.value = next;
}

setKeyframe(0, { x: 0, y: 0 });
setKeyframe(500, { x: 100, y: 40 });
deleteKeyframe(0);
```

`Atom` compares values with strict equality (`===`). Each assignment of a new map emits `beforeChange` and `change`, even when the new map holds the same entries. The `change` event passes the whole maps in `valueFrom` and `value`. To find the changed keys, compare the two maps in the listener.

A change to the map in place does not run the setter. No event fires, and history entries that hold the map change too. For more information, see [Changing an Atom Value in Place](ui-integration-patterns.md#4-changing-an-atom-value-in-place).

## Undo and redo

History holds references to atom values. Because each change assigns a new map, `undo()` and `redo()` restore a map by assigning the recorded reference.

Each write copies the whole map. The time of a write grows with the number of entries. Each history step adds one map, so the memory of the history also grows with the number of entries. To limit the memory, set `{ maxHistory }` in the `useHistory` option.

## Avoid ObjectAtom for a map

Do not hold a `Map` in an `ObjectAtom`. `ObjectAtom` compares the new value with the current value through `deepEqual` of fast-equals. For two maps, `deepEqual` compares each entry with the entries of the other map. When the two maps have the same size, the comparison time grows up to the square of the number of entries.

## Serialize a map

`JSON.stringify()` converts a `Map` to `{}`. As a result, `toJson()` drops every entry without an error. `fromJson()` then assigns a plain object to the atom.

Select one of the following approaches:

- If string keys are enough, hold the collection in an `Atom<Readonly<Record<string, V>>>`. `toJson()` and `fromJson()` keep its entries.
- If the server does not need the collection, set `skipSerialization: true` on the atom. The container still restores the atom through `undo()` and `redo()`.
- To keep a `Map`, convert it outside the container. Convert the output of `toObject()` before you serialize it, and convert the input before you pass it to `fromObject()` or `load()`.

The following example uses the `Keyframe` interface from [Update a map](#update-a-map).

```typescript
import { Atom, AtomContainer } from "@masatomakino/state-atoms";

type TimelineData = { keyframes: ReadonlyMap<number, Keyframe> };

class Timeline extends AtomContainer<TimelineData> {
  keyframes = new Atom<ReadonlyMap<number, Keyframe>>(new Map());

  constructor() {
    super({ useHistory: true });
    this.connectMemberAtoms();
  }
}

const timeline = new Timeline();

const json = JSON.stringify({
  keyframes: [...timeline.toObject().keyframes],
});

const parsed: { keyframes: [number, Keyframe][] } = JSON.parse(json);
timeline.load({ keyframes: new Map(parsed.keyframes) });
```
