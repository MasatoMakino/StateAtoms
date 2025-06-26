import type { AtomEventArgs } from "./AtomEventArgs.js";

export interface AtomEvents<T> {
  beforeChange: (arg: AtomEventArgs<T>) => void;
  change: (arg: AtomEventArgs<T>) => void;
  addHistory: () => void;
}
