import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer, type AtomEvents } from "../src/index.js";

/**
 * Example interface showing how to extend AtomEvents for custom event types.
 * This pattern allows containers to emit domain-specific events beyond the standard change/history events.
 */
export interface ExtendAtomEvents extends AtomEvents<unknown> {
  addTest: (arg: number) => void;
}

/**
 * Test helper demonstrating TypeScript event system extensibility.
 * Shows how to create containers with custom event types while maintaining type safety.
 */
export class ExtendEventContainer extends AtomContainer<
  unknown,
  ExtendAtomEvents
> {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

describe("AtomContainer.Event - Custom event type extensions and TypeScript integration", () => {
  it("should emit custom events with proper type safety and argument passing", () => {
    const container = new ExtendEventContainer();
    const spy = vi.fn();
    container.on("addTest", spy);
    container.emit("addTest", 100);
    expect(spy).toHaveBeenCalledWith(100);
  });
});
