import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

class ChildContainer extends AtomContainer {
  readonly count: Atom<number>;
  readonly hidden = new Atom("tmp", { skipSerialization: true });
  constructor(count = new Atom(0)) {
    super();
    this.count = count;
    this.connectMemberAtoms();
  }
}

class ParentContainer extends AtomContainer {
  readonly name = new Atom("John");
  readonly child: ChildContainer;
  constructor(child = new ChildContainer()) {
    super({ useHistory: true });
    this.child = child;
    this.connectMemberAtoms();
  }
}

describe("Atom.dispose", () => {
  it("removes every listener so that the atom releases its subscribers", () => {
    const atom = new Atom(0);
    const spy = vi.fn();
    atom.on("change", spy);

    atom.dispose();
    atom.value = 1;

    expect(spy).not.toHaveBeenCalled();
    expect(atom.eventNames()).toEqual([]);
  });
});

describe("AtomContainer.dispose", () => {
  it("releases the listeners on every nested member so that no member keeps the tree alive", () => {
    const parent = new ParentContainer();

    parent.dispose();

    expect(parent.name.eventNames()).toEqual([]);
    expect(parent.child.eventNames()).toEqual([]);
    expect(parent.child.count.eventNames()).toEqual([]);
    expect(parent.child.hidden.eventNames()).toEqual([]);
  });

  it("removes the subscribers of the container so that disposed state stops notifying them", () => {
    const parent = new ParentContainer();
    parent.on("change", vi.fn());

    parent.dispose();

    expect(parent.eventNames()).toEqual([]);
  });

  // Discard condition: design decision by the repository maintainer (2026-10-28).
  // dispose() assumes the container owns its members, so a shared member loses
  // every listener. Rebuild this test if an API that detaches a single owner
  // from a shared member is adopted, or if the ownership semantics change.
  it("removes the listeners of other containers on a shared atom because the disposed container owns its members", () => {
    const shared = new Atom(0);
    const disposed = new ChildContainer(shared);
    const survivor = new ChildContainer(shared);
    const survivorSpy = vi.fn();
    survivor.on("change", survivorSpy);

    disposed.dispose();
    shared.value = 1;

    expect(survivorSpy).not.toHaveBeenCalled();
  });
});
