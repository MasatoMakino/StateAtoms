import { describe, it, expect, vi } from "vitest";
import { Atom, AtomContainer, AtomEvents } from "../src/index.js";

export interface ExtendAtomEvents extends AtomEvents<unknown> {
  addTest: (arg: number) => void;
}

export class ExtendEventContainer extends AtomContainer<
  unknown,
  ExtendAtomEvents
> {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor() {
    super();
    this.init();
  }
}

describe("AtomContainer.Event", () => {
  it("should emit extended event", () => {
    const container = new ExtendEventContainer();
    const spy = vi.fn();
    container.on("addTest", spy);
    container.emit("addTest", 100);
    expect(spy).toHaveBeenCalledWith(100);
  });
});
