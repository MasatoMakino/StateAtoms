import { AtomContainer } from "./AtomContainer.js";
import type { AtomEvents } from "./AtomEvents.js";

/**
 * Type inference helper that extracts AtomEvents type from DataType structure.
 *
 * This utility type automatically derives the appropriate AtomEvents type
 * based on the value types present in the DataType interface.
 *
 * @template DataType - The data structure type containing atom properties
 *
 * @example
 * ```typescript
 * type MyData = { count: number; name: string };
 * type InferredEvents = InferredEventTypes<MyData>;
 * // Result: AtomEvents<number | string>
 * ```
 */
export type InferredEventTypes<DataType> = DataType extends Record<
  string,
  infer U
>
  ? AtomEvents<U>
  : AtomEvents<unknown>;

/**
 * Smart AtomContainer with automatic EventTypes inference from DataType.
 *
 * This class extends the standard AtomContainer but automatically infers
 * the EventTypes generic parameter from the DataType structure, eliminating
 * the need for manual EventTypes specification.
 *
 * The type inference works by extracting all value types from the DataType
 * record and creating a union type for AtomEvents. This provides better
 * type safety for event handlers while maintaining backward compatibility.
 *
 * @template DataType - The data structure type containing atom properties
 *
 * @example
 * ```typescript
 * interface UserData {
 *   name: string;
 *   age: number;
 *   email: string;
 * }
 *
 * class UserContainer extends SmartAtomContainer<UserData> {
 *   name = new Atom("");
 *   age = new Atom(0);
 *   email = new Atom("");
 *
 *   constructor() {
 *     super();
 *     this.init();
 *   }
 * }
 *
 * const container = new UserContainer();
 *
 * // Event handlers now have inferred types
 * container.on("change", (args) => {
 *   // args is typed as AtomEventArgs<string | number>
 *   console.log(`Value changed: ${args.valueFrom} -> ${args.value}`);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Simple numeric counter example
 * interface CounterData {
 *   count: number;
 * }
 *
 * class Counter extends SmartAtomContainer<CounterData> {
 *   count = new Atom(0);
 *
 *   constructor() {
 *     super();
 *     this.init();
 *   }
 *
 *   increment() {
 *     this.count.value += 1;
 *   }
 * }
 *
 * const counter = new Counter();
 * counter.on("change", (args) => {
 *   // args is precisely typed as AtomEventArgs<number>
 *   console.log(`Counter: ${args.value}`);
 * });
 * ```
 *
 * @since 0.2.0
 * @see {@link AtomContainer} for the base container functionality
 * @see {@link InferredEventTypes} for the type inference implementation
 */
export class SmartAtomContainer<DataType = unknown> extends AtomContainer<
  DataType,
  InferredEventTypes<DataType>
> {
  // No additional implementation needed - the magic is in the type signature
  // All functionality is inherited from AtomContainer with enhanced typing
}
