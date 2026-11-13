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
