# StateAtoms

StateAtoms is a library designed to simplify state management. This README provides an overview and usage instructions for StateAtoms.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)
[![test](https://github.com/MasatoMakino/StateAtoms/actions/workflows/ci.yml/badge.svg)](https://github.com/MasatoMakino/StateAtoms/actions/workflows/ci.yml)

## Overview

StateAtoms divides state into small units called Atoms, which are combined to represent state. This makes it easy to manage and monitor state changes.

## Installation

You can install StateAtoms using npm. Run the following command:

```
npm install @masatomakino/state-atoms
```

## Usage

### Atom

To use StateAtoms, first import the necessary modules:

```javascript
import { Atom } from "@masatomakino/state-atoms";
```

Next, create an atom:

```javascript
const countAtom = new Atom(0);
```

An atom is an object that holds the state value. In the example above, the initial value is set to 0.

To change the value of an atom, use the `value` property:

```javascript
countAtom.value = 1;
```

To receive notifications when the value of an atom changes, use the `on` event handler:

```javascript
countAtom.on("change", (arg) => {
  console.log(`Value changed: ${arg.valueFrom} -> ${arg.value}`);
});
```

### AtomContainer

An AtomContainer is a class used to manage multiple atoms together.

```javascript
import { AtomContainer } from "@masatomakino/state-atoms";

class CustomContainer extends AtomContainer {
  constructor() {
    super();
    this.atom1 = new Atom(0);
    this.atom2 = new Atom(1);
    this.init();
  }
}
```

Add atoms as member variables to the AtomContainer and call the init method to initialize the AtomContainer.

```javascript
const container = new CustomContainer();

container.on("change", (arg) => {
  console.log(
    `Value changed: ${arg.from} ${arg.valueFrom} -> ${arg.value}`,
  );
});
container.atom1.value = 1;
```

Events like change propagate to the AtomContainer. In the example above, when the value of atom1 changes, the AtomContainer receives the notification.

An AtomContainer can output the values of its atoms as an object or a JSON string using the toObject or toJSON methods. You can also restore the values of the atoms using the output object.

```javascript
const dump = container.toObject();
container.atom1.value = 2;
container.fromObject(dump);
console.log( container.atom1.value ); // 1
```

These are the basic usage instructions for StateAtoms.

License
This project is licensed under the MIT License - see the LICENSE file for details.