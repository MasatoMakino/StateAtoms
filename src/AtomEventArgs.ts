import type { Atom } from "./Atom.js";

export interface AtomEventArgs<T> {
  from: Atom<T>;
  value: T;
  valueFrom: T;
}
