import { describe, expect, it } from "vitest";
import {
  Atom,
  AtomContainer,
  type AtomContainerOptions,
} from "../src/index.js";

/**
 * Test helper class that demonstrates basic AtomContainer usage patterns.
 * Contains two atoms for testing event propagation, serialization, and state management.
 */
export class SimpleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor(options?: AtomContainerOptions) {
    super(options);
    this.init();
  }
}

/**
 * AtomContainer Event Propagation Order Specification
 *
 * ## CONCLUSION: Event Execution Priority Order
 *
 * 1. **Event Type**: beforeChange → change
 * 2. **Container Hierarchy**: parent → child
 * 3. **Registration Order**: within same container, execute in registration order
 *
 * ## GUARANTEED PATTERNS: Assured Execution Patterns
 *
 * **Cross-hierarchy**: parent-beforeChange → child-beforeChange → parent-change → child-change
 * **Same-container**: listener-1 → listener-2 → listener-3 (registration order)
 * **Mixed scenario**: beforeChange-L1 → beforeChange-L2 → change-L1 → change-L2
 *
 * ## IMPLEMENTATION: Technical Foundation
 *
 * AtomContainer uses "immediate re-emission" pattern:
 * - Parent re-emits immediately upon receiving events from children
 * - Leverages EventEmitter3's registration order behavior
 * - Maintains registration order within same container regardless of event source
 */
describe("AtomContainer - Event Propagation Order Specification", () => {
  it("CORE: parent → child propagation order", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();
      constructor() {
        super();
        this.init();
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

    // Basic pattern: parent → child order guarantee
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
        this.init();
      }
    }

    // Test Pattern 1: Normal registration order (parent → child)
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

    // Test Pattern 2: Reversed registration order (child → parent)
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

    // Guarantees identical results regardless of registration sequence
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
        this.init();
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

      // Guarantees identical results across all patterns
      expect(eventOrder).toEqual(expectedOrder);
    });
  });

  it("DETAIL: EventEmitter3 registration order", () => {
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.init();
      }
    }

    const container = new NestedContainer();
    const executionOrder: string[] = [];

    // Register listeners in A→B→C order
    container.on("change", () => executionOrder.push("listener-A"));
    container.on("change", () => executionOrder.push("listener-B"));
    container.on("change", () => executionOrder.push("listener-C"));

    container.child.atom1.value = 100;

    // EventEmitter3 preserves registration order
    expect(executionOrder).toEqual(["listener-A", "listener-B", "listener-C"]);
  });

  it("PRIORITY: event type → registration order", () => {
    /**
     * CONCLUSION: Event type order → registration order priority
     *
     * When multiple listeners are registered on the same container:
     * - beforeChange → change order is preserved
     * - Within each event type, listeners execute in registration order
     * - Event source (parent/child) does not affect execution order
     *
     * WHY: EventEmitter3's consistent behavior ensures predictable event processing
     */
    class NestedContainer extends AtomContainer {
      child = new SimpleAtomContainer();

      constructor() {
        super();
        this.init();
      }
    }

    const container = new NestedContainer();
    const executionOrder: string[] = [];

    // Register multiple listeners for both event types in specific order
    container.on("beforeChange", () =>
      executionOrder.push("beforeChange-listener-1"),
    );
    container.on("beforeChange", () =>
      executionOrder.push("beforeChange-listener-2"),
    );
    container.on("change", () => executionOrder.push("change-listener-1"));
    container.on("change", () => executionOrder.push("change-listener-2"));

    // Trigger event from child - this will propagate to parent
    container.child.atom1.value = 999;

    // Applies event type → registration order priority
    expect(executionOrder).toEqual([
      "beforeChange-listener-1",
      "beforeChange-listener-2",
      "change-listener-1",
      "change-listener-2",
    ]);
  });
});
