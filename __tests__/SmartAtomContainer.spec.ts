import { describe, expect, it, vi } from "vitest";
import { Atom } from "../src/Atom.js";
import type { AtomEventArgs } from "../src/index.js";
import { SmartAtomContainer } from "../src/SmartAtomContainer.js";

/**
 * Test interfaces for type inference validation
 */
interface SimpleData {
  count: number;
}

interface MultipleTypeData {
  name: string;
  age: number;
  active: boolean;
}

interface ComplexData {
  user: { name: string; age: number };
  settings: { theme: string; notifications: boolean };
  counter: number;
}

/**
 * Test container implementations
 */
class SimpleContainer extends SmartAtomContainer<SimpleData> {
  count = new Atom(0);

  constructor() {
    super();
    this.init();
  }
}

class MultipleTypeContainer extends SmartAtomContainer<MultipleTypeData> {
  name = new Atom("");
  age = new Atom(0);
  active = new Atom(false);

  constructor() {
    super();
    this.init();
  }
}

class ComplexContainer extends SmartAtomContainer<ComplexData> {
  user = new Atom({ name: "", age: 0 });
  settings = new Atom({ theme: "light", notifications: true });
  counter = new Atom(42);

  constructor() {
    super();
    this.init();
  }
}

describe("SmartAtomContainer - Type Inference and Basic Functionality", () => {
  describe("Type Inference", () => {
    it("should infer correct event types for simple data structures", () => {
      const container = new SimpleContainer();

      const changeHandler = vi.fn((args: AtomEventArgs<unknown>) => {
        expect(typeof args.value).toBe("number");
      });

      container.on("change", changeHandler);
      container.count.value = 42;

      expect(changeHandler).toHaveBeenCalledOnce();
    });

    it("should infer union types for multiple property types", () => {
      const container = new MultipleTypeContainer();

      const changeHandler = vi.fn((args: AtomEventArgs<unknown>) => {
        expect(["string", "number", "boolean"]).toContain(typeof args.value);
      });

      container.on("change", changeHandler);

      container.name.value = "test";
      container.age.value = 25;
      container.active.value = true;

      expect(changeHandler).toHaveBeenCalledTimes(3);
    });

    it("should handle complex nested object types", () => {
      const container = new ComplexContainer();

      const changeHandler = vi.fn();
      container.on("change", changeHandler);

      container.user.value = { name: "Alice", age: 30 };
      container.settings.value = { theme: "dark", notifications: false };
      container.counter.value = 100;

      expect(changeHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe("Basic Container Functionality", () => {
    it("should inherit all AtomContainer functionality", () => {
      const container = new SimpleContainer();

      expect(container.count.value).toBe(0);
      container.count.value = 42;
      expect(container.count.value).toBe(42);

      const serialized = container.toObject();
      expect(serialized).toEqual({ count: 42 });
    });

    it("should support fromObject deserialization", () => {
      const container = new SimpleContainer();

      container.fromObject({ count: 123 });
      expect(container.count.value).toBe(123);
    });

    it("should emit beforeChange and change events", () => {
      const container = new SimpleContainer();

      const beforeChangeHandler = vi.fn();
      const changeHandler = vi.fn();

      container.on("beforeChange", beforeChangeHandler);
      container.on("change", changeHandler);

      container.count.value = 99;

      expect(beforeChangeHandler).toHaveBeenCalledOnce();
      expect(changeHandler).toHaveBeenCalledOnce();

      const changeArgs = changeHandler.mock.calls[0][0];
      expect(changeArgs.value).toBe(99);
      expect(changeArgs.valueFrom).toBe(0);
    });
  });

  describe("Event Propagation", () => {
    it("should propagate events from child atoms to container", () => {
      const container = new MultipleTypeContainer();

      const containerChangeHandler = vi.fn();
      container.on("change", containerChangeHandler);

      container.name.value = "propagated";

      expect(containerChangeHandler).toHaveBeenCalledOnce();

      const eventArgs = containerChangeHandler.mock.calls[0][0];
      expect(eventArgs.value).toBe("propagated");
      expect(eventArgs.from).toBe(container.name);
    });

    it("should maintain event order consistency", () => {
      const container = new SimpleContainer();

      const events: string[] = [];

      container.on("beforeChange", () => events.push("container-beforeChange"));
      container.on("change", () => events.push("container-change"));

      container.count.on("beforeChange", () =>
        events.push("atom-beforeChange"),
      );
      container.count.on("change", () => events.push("atom-change"));

      container.count.value = 777;

      expect(events).toEqual([
        "container-beforeChange",
        "atom-beforeChange",
        "container-change",
        "atom-change",
      ]);
    });
  });

  describe("Type Safety Validation", () => {
    it("should provide type-safe event handlers", () => {
      const container = new SimpleContainer();

      container.on("change", (args) => {
        expect(typeof args.value).toBe("number");
        expect(typeof args.valueFrom).toBe("number");
        expect(args.from).toBe(container.count);
      });

      container.count.value = 42;
    });

    it("should support custom event types through extension", () => {
      class CustomContainer extends SmartAtomContainer<SimpleData> {
        count = new Atom(0);

        constructor() {
          super();
          this.init();
        }

        triggerCustomEvent(data: string) {
          (
            this as unknown as { emit: (event: string, data: string) => void }
          ).emit("customEvent", data);
        }
      }

      const container = new CustomContainer();
      const customHandler = vi.fn();

      (
        container as unknown as {
          on: (event: string, handler: (data: string) => void) => void;
        }
      ).on("customEvent", customHandler);
      container.triggerCustomEvent("test data");

      expect(customHandler).toHaveBeenCalledWith("test data");
    });
  });

  describe("Backward Compatibility", () => {
    it("should work with existing AtomContainer patterns", () => {
      const container = new SimpleContainer();

      expect(container).toBeInstanceOf(SmartAtomContainer);
      expect(container.count).toBeInstanceOf(Atom);
      expect(typeof container.toObject).toBe("function");
      expect(typeof container.fromObject).toBe("function");
    });

    it("should support serialization options", () => {
      class SkipSerializationContainer extends SmartAtomContainer<SimpleData> {
        count = new Atom(0);

        constructor() {
          super({ skipSerialization: true });
          this.init();
        }
      }

      const container = new SkipSerializationContainer();
      expect(container.skipSerialization).toBe(true);
    });

    it("should support history functionality", () => {
      class HistoryContainer extends SmartAtomContainer<SimpleData> {
        count = new Atom(0);

        constructor() {
          super({ useHistory: true });
          this.init();
        }
      }

      const container = new HistoryContainer();
      const historyHandler = vi.fn();

      container.on("addHistory", historyHandler);
      container.count.value = 123;
      container.emit("addHistory");

      expect(historyHandler).toHaveBeenCalled();
    });
  });
});
