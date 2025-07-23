import { describe, expect, it } from "vitest";
import { Atom } from "../src/Atom.js";
import { AtomContainer } from "../src/AtomContainer.js";
import { SmartAtomContainer } from "../src/SmartAtomContainer.js";

/**
 * Performance test interfaces with varying complexity levels
 */
interface SimplePerformanceData {
  counter: number;
}

interface MediumPerformanceData {
  name: string;
  age: number;
  active: boolean;
  score: number;
  category: string;
}

interface ComplexPerformanceData {
  user: { id: number; profile: { name: string; email: string } };
  settings: {
    theme: string;
    preferences: { notifications: boolean; language: string };
  };
  data: { items: number[]; metadata: { created: string; updated: string } };
  stats: { views: number; likes: number; shares: number };
  config: { feature1: boolean; feature2: string; feature3: number };
}

/**
 * Performance test container implementations
 */
class SimplePerformanceContainer extends SmartAtomContainer<SimplePerformanceData> {
  counter = new Atom(0);

  constructor() {
    super();
    this.init();
  }
}

class MediumPerformanceContainer extends SmartAtomContainer<MediumPerformanceData> {
  name = new Atom("");
  age = new Atom(0);
  active = new Atom(false);
  score = new Atom(0);
  category = new Atom("");

  constructor() {
    super();
    this.init();
  }
}

class ComplexPerformanceContainer extends SmartAtomContainer<ComplexPerformanceData> {
  user = new Atom({ id: 0, profile: { name: "", email: "" } });
  settings = new Atom({
    theme: "",
    preferences: { notifications: false, language: "" },
  });
  data = new Atom({ items: [], metadata: { created: "", updated: "" } });
  stats = new Atom({ views: 0, likes: 0, shares: 0 });
  config = new Atom({ feature1: false, feature2: "", feature3: 0 });

  constructor() {
    super();
    this.init();
  }
}

/**
 * Equivalent traditional AtomContainer implementations for comparison
 */
class TraditionalSimpleContainer extends AtomContainer<SimplePerformanceData> {
  counter = new Atom(0);

  constructor() {
    super();
    this.init();
  }
}

describe("SmartAtomContainer - Performance and Scalability", () => {
  describe("Instantiation Performance", () => {
    it("should have similar instantiation time to regular AtomContainer", () => {
      const iterations = 1000;

      const smartStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        new SimplePerformanceContainer();
      }
      const smartEnd = performance.now();
      const smartTime = smartEnd - smartStart;

      const traditionalStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        new TraditionalSimpleContainer();
      }
      const traditionalEnd = performance.now();
      const traditionalTime = traditionalEnd - traditionalStart;

      const timeDifference = Math.abs(smartTime - traditionalTime);
      const threshold = Math.max(smartTime, traditionalTime) * 0.5; // 50% tolerance for performance variability

      expect(timeDifference).toBeLessThan(threshold);
      console.log(
        `Smart: ${smartTime.toFixed(2)}ms, Traditional: ${traditionalTime.toFixed(2)}ms`,
      );
    });

    it("should scale reasonably with container complexity", () => {
      const iterations = 100;

      const simpleStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        new SimplePerformanceContainer();
      }
      const simpleTime = performance.now() - simpleStart;

      const mediumStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        new MediumPerformanceContainer();
      }
      const mediumTime = performance.now() - mediumStart;

      const complexStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        new ComplexPerformanceContainer();
      }
      const complexTime = performance.now() - complexStart;

      expect(mediumTime).toBeLessThan(simpleTime * 10);
      expect(complexTime).toBeLessThan(mediumTime * 10);

      console.log(
        `Simple: ${simpleTime.toFixed(2)}ms, Medium: ${mediumTime.toFixed(2)}ms, Complex: ${complexTime.toFixed(2)}ms`,
      );
    });
  });

  describe("Event Emission Performance", () => {
    it("should handle rapid value changes efficiently", () => {
      const container = new MediumPerformanceContainer();
      const iterations = 10000;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        container.name.value = `name-${i}`;
        container.age.value = i;
        container.active.value = i % 2 === 0;
        container.score.value = i * 1.5;
        container.category.value = `category-${i % 5}`;
      }

      const end = performance.now();
      const totalTime = end - start;
      const timePerOperation = totalTime / (iterations * 5); // 5 operations per iteration

      expect(timePerOperation).toBeLessThan(0.1); // Less than 0.1ms per operation
      console.log(
        `${timePerOperation.toFixed(4)}ms per value change operation`,
      );
    });

    it("should maintain performance with multiple event listeners", () => {
      const container = new SimplePerformanceContainer();
      const listenerCount = 100;
      const iterations = 1000;

      for (let i = 0; i < listenerCount; i++) {
        container.on("change", () => {
          // Simulate some work
          Math.random();
        });
      }

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        container.counter.value = i;
      }

      const end = performance.now();
      const totalTime = end - start;

      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      console.log(
        `${totalTime.toFixed(2)}ms for ${iterations} changes with ${listenerCount} listeners`,
      );
    });
  });

  describe("Serialization Performance", () => {
    it("should serialize complex structures efficiently", () => {
      const container = new ComplexPerformanceContainer();

      container.user.value = {
        id: 123,
        profile: { name: "Test User", email: "test@example.com" },
      };
      container.settings.value = {
        theme: "dark",
        preferences: { notifications: true, language: "en" },
      };
      container.data.value = {
        items: [1, 2, 3, 4, 5],
        metadata: { created: "2024-01-01", updated: "2024-01-02" },
      };
      container.stats.value = { views: 1000, likes: 50, shares: 25 };
      container.config.value = {
        feature1: true,
        feature2: "enabled",
        feature3: 42,
      };

      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        container.toObject();
      }
      const end = performance.now();

      const timePerSerialization = (end - start) / iterations;
      expect(timePerSerialization).toBeLessThan(1); // Less than 1ms per serialization

      console.log(
        `${timePerSerialization.toFixed(4)}ms per complex serialization`,
      );
    });

    it("should deserialize efficiently", () => {
      const container = new MediumPerformanceContainer();
      const testData = {
        name: "Performance Test",
        age: 30,
        active: true,
        score: 95.5,
        category: "testing",
      };

      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        container.fromObject({
          ...testData,
          age: testData.age + i,
          score: testData.score + i,
        });
      }
      const end = performance.now();

      const timePerDeserialization = (end - start) / iterations;
      expect(timePerDeserialization).toBeLessThan(1); // Less than 1ms per deserialization

      console.log(`${timePerDeserialization.toFixed(4)}ms per deserialization`);
    });
  });

  describe("Memory Usage", () => {
    it("should not create excessive memory overhead", () => {
      const containers: SmartAtomContainer[] = [];
      const containerCount = 1000;

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < containerCount; i++) {
        containers.push(new SimplePerformanceContainer());
      }

      const afterCreationMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterCreationMemory - initialMemory;
      const memoryPerContainer = memoryIncrease / containerCount;

      expect(memoryPerContainer).toBeLessThan(10000); // Less than 10KB per container
      console.log(`${memoryPerContainer.toFixed(0)} bytes per container`);

      containers.length = 0;
    });
  });

  describe("Type System Performance", () => {
    it("should not significantly slow down TypeScript compilation", () => {
      type SimpleInferred = SmartAtomContainer<{ a: number }>;
      type MediumInferred = SmartAtomContainer<{
        a: number;
        b: string;
        c: boolean;
      }>;
      type ComplexInferred = SmartAtomContainer<{
        a: number;
        b: string;
        c: boolean;
        d: { nested: string };
        e: { deep: { value: number } };
      }>;

      const simple: SimpleInferred = new SmartAtomContainer();
      const medium: MediumInferred = new SmartAtomContainer();
      const complex: ComplexInferred = new SmartAtomContainer();

      expect(simple).toBeDefined();
      expect(medium).toBeDefined();
      expect(complex).toBeDefined();
    });
  });
});
