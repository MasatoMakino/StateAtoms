import { afterEach, describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

type LeafData = { value: number };
type MiddleData = { leaf: LeafData };
type RootData = { count: number; middle: MiddleData };

class Leaf extends AtomContainer<LeafData> {
  readonly value = new Atom(0);
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

class Middle extends AtomContainer<MiddleData> {
  readonly leaf = new Leaf();
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

class Root extends AtomContainer<RootData> {
  readonly count = new Atom(0);
  readonly middle = new Middle();
  constructor(options?: { useHistory: boolean }) {
    super(options);
    this.connectMemberAtoms();
  }
}

/**
 * Casts input that the parameter type rejects, as JSON.parse() output can.
 */
const untyped = (input: unknown) => input as Partial<RootData>;

describe("AtomContainer restore validation - a rejected input writes no atom", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The invalid key follows a valid key, so a check during the write would
  // already have written count.
  it("fromObject() throws for a null nested container without writing an atom that precedes it", () => {
    const root = new Root();
    const onChange = vi.fn();
    root.on("change", onChange);

    expect(() => root.fromObject(untyped({ count: 1, middle: null }))).toThrow(
      TypeError,
    );
    expect(root.count.value).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fromObject() throws for an undefined grandchild container without writing any atom", () => {
    const root = new Root();

    expect(() =>
      root.fromObject(untyped({ count: 1, middle: { leaf: undefined } })),
    ).toThrow(TypeError);
    expect(root.count.value).toBe(0);
  });

  it.each([null, undefined])("fromObject() throws for %s input", (input) => {
    const root = new Root();

    expect(() => root.fromObject(untyped(input))).toThrow(TypeError);
  });

  it("load() throws for a null nested container without clearing the history or emitting historyChange", () => {
    const root = new Root({ useHistory: true });
    root.count.value = 1;
    root.addHistory();
    const onHistoryChange = vi.fn();
    root.on("historyChange", onHistoryChange);

    expect(() => root.load(untyped({ count: 2, middle: null }))).toThrow(
      TypeError,
    );
    expect(root.count.value).toBe(1);
    expect(onHistoryChange).not.toHaveBeenCalled();
    root.undo();
    expect(root.count.value).toBe(0);
  });

  // The check reads the child container keys that connectMemberAtoms()
  // records, so a later call must record a member added in between.
  it("fromObject() checks a nested container that a second connectMemberAtoms() call registers", () => {
    class Growing extends AtomContainer<{ count: number; extra?: LeafData }> {
      readonly count = new Atom(0);
      extra?: Leaf;
      constructor() {
        super();
        this.connectMemberAtoms();
      }
      grow() {
        this.extra = new Leaf();
        this.connectMemberAtoms();
      }
    }
    const root = new Growing();
    root.grow();

    expect(() => root.fromObject({ count: 1, extra: null } as never)).toThrow(
      TypeError,
    );
    expect(root.count.value).toBe(0);
  });

  // Before connectMemberAtoms(), no child container keys are recorded.
  it("fromObject() checks nested containers before connectMemberAtoms() runs", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    class Unconnected extends AtomContainer<RootData> {
      readonly count = new Atom(0);
      readonly middle = new Middle();
    }
    const root = new Unconnected();

    expect(() => root.fromObject(untyped({ count: 1, middle: null }))).toThrow(
      TypeError,
    );
    expect(root.count.value).toBe(0);
  });
});
