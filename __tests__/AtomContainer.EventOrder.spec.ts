import { describe, expect, it } from "vitest";
import {
  Atom,
  AtomContainer,
  type AtomContainerOptions,
} from "../src/index.js";

class SimpleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor(options?: AtomContainerOptions) {
    super(options);
    this.connectMemberAtoms();
  }
}

/**
 * Listeners run in this priority: event type (beforeChange before change),
 * then container hierarchy (parent before child), then registration order
 * within one container. A parent re-emits a child event as soon as it
 * receives it.
 */
describe("AtomContainer - Event Propagation Order Specification", () => {
  it("parent listeners run before child listeners for every registration order, because a parent re-emits a child event as soon as it receives it", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.connectMemberAtoms();
      }
    }

    const registrationPatterns = [
      {
        name: "parent-first",
        setup: (container: NestedContainer, eventOrder: string[]) => {
          container.on("beforeChange", () =>
            eventOrder.push("parent-beforeChange"),
          );
          container.on("change", () => eventOrder.push("parent-change"));
          container.child.on("beforeChange", () =>
            eventOrder.push("child-beforeChange"),
          );
          container.child.on("change", () => eventOrder.push("child-change"));
        },
      },
      {
        name: "child-first",
        setup: (container: NestedContainer, eventOrder: string[]) => {
          container.child.on("beforeChange", () =>
            eventOrder.push("child-beforeChange"),
          );
          container.child.on("change", () => eventOrder.push("child-change"));
          container.on("beforeChange", () =>
            eventOrder.push("parent-beforeChange"),
          );
          container.on("change", () => eventOrder.push("parent-change"));
        },
      },
      {
        name: "interleaved",
        setup: (container: NestedContainer, eventOrder: string[]) => {
          container.on("beforeChange", () =>
            eventOrder.push("parent-beforeChange"),
          );
          container.child.on("beforeChange", () =>
            eventOrder.push("child-beforeChange"),
          );
          container.on("change", () => eventOrder.push("parent-change"));
          container.child.on("change", () => eventOrder.push("child-change"));
        },
      },
    ];

    const expectedOrder = [
      "parent-beforeChange",
      "child-beforeChange",
      "parent-change",
      "child-change",
    ];

    registrationPatterns.forEach((pattern) => {
      const container = new NestedContainer();
      const eventOrder: string[] = [];

      pattern.setup(container, eventOrder);
      container.child.atom1.value = 999;

      expect(eventOrder).toEqual(expectedOrder);
    });
  });
});
