import { describe, expect, it } from "vitest";
import {
  Atom,
  AtomContainer,
  type AtomContainerOptions,
} from "../src/index.js";

export class SimpleAtomContainer extends AtomContainer {
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
  it("CORE: parent → child propagation order", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();
      constructor() {
        super();
        this.connectMemberAtoms();
      }
    }

    const container = new NestedContainer();
    const eventOrder: string[] = [];

    container.on("beforeChange", () => eventOrder.push("parent-beforeChange"));
    container.on("change", () => eventOrder.push("parent-change"));
    container.child.on("beforeChange", () =>
      eventOrder.push("child-beforeChange"),
    );
    container.child.on("change", () => eventOrder.push("child-change"));

    container.child.atom1.value = 999;

    expect(eventOrder).toEqual([
      "parent-beforeChange",
      "child-beforeChange",
      "parent-change",
      "child-change",
    ]);
  });

  it("ROBUSTNESS: registration order independence", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.connectMemberAtoms();
      }
    }

    // Registration order: parent, then child
    const container1 = new NestedContainer();
    const eventOrder1: string[] = [];

    container1.on("beforeChange", () =>
      eventOrder1.push("parent-beforeChange"),
    );
    container1.on("change", () => eventOrder1.push("parent-change"));
    container1.child.on("beforeChange", () =>
      eventOrder1.push("child-beforeChange"),
    );
    container1.child.on("change", () => eventOrder1.push("child-change"));

    container1.child.atom1.value = 999;
    const normalOrder = [...eventOrder1];

    // Registration order: child, then parent
    const container2 = new NestedContainer();
    const eventOrder2: string[] = [];

    container2.child.on("beforeChange", () =>
      eventOrder2.push("child-beforeChange"),
    );
    container2.child.on("change", () => eventOrder2.push("child-change"));
    container2.on("beforeChange", () =>
      eventOrder2.push("parent-beforeChange"),
    );
    container2.on("change", () => eventOrder2.push("parent-change"));

    container2.child.atom1.value = 999;
    const reversedOrder = [...eventOrder2];

    expect(normalOrder).toEqual(reversedOrder);
    expect(normalOrder).toEqual([
      "parent-beforeChange",
      "child-beforeChange",
      "parent-change",
      "child-change",
    ]);
  });

  it("CONSISTENCY: multiple registration patterns", () => {
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
      container.child.atom1.value = Math.random() * 1000;

      expect(eventOrder).toEqual(expectedOrder);
    });
  });

  it("DETAIL: EventEmitter3 registration order", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.connectMemberAtoms();
      }
    }

    const container = new NestedContainer();
    const executionOrder: string[] = [];

    container.on("change", () => executionOrder.push("listener-A"));
    container.on("change", () => executionOrder.push("listener-B"));
    container.on("change", () => executionOrder.push("listener-C"));

    container.child.atom1.value = 100;

    expect(executionOrder).toEqual(["listener-A", "listener-B", "listener-C"]);
  });

  it("PRIORITY: event type → registration order", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.connectMemberAtoms();
      }
    }

    const container = new NestedContainer();
    const executionOrder: string[] = [];

    container.on("beforeChange", () =>
      executionOrder.push("beforeChange-listener-1"),
    );
    container.on("beforeChange", () =>
      executionOrder.push("beforeChange-listener-2"),
    );
    container.on("change", () => executionOrder.push("change-listener-1"));
    container.on("change", () => executionOrder.push("change-listener-2"));

    container.child.atom1.value = 999;

    expect(executionOrder).toEqual([
      "beforeChange-listener-1",
      "beforeChange-listener-2",
      "change-listener-1",
      "change-listener-2",
    ]);
  });
});
