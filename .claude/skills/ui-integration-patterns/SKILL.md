---
name: ui-integration-patterns
description: UI integration patterns for StateAtoms history management. Use when implementing undo/redo with UI elements, binding atoms to inputs/sliders/selects, or designing history event timing.
---

# UI Integration Patterns for History Management

This guide provides comprehensive examples for integrating StateAtoms with various UI elements while maintaining optimal history management for undo/redo operations.

## Overview

StateAtoms uses a deliberate design where `change` events are automatic (for immediate UI updates) but `addHistory` events are manual (for meaningful user action boundaries). This allows applications to control when meaningful snapshots are created, resulting in intuitive undo/redo behavior that matches user expectations.

### Key Principles

1. **Immediate Responsiveness**: Value changes should immediately update the UI via `change` events
2. **Meaningful Snapshots**: History snapshots should represent complete user actions, not intermediate states
3. **User Expectation**: Undo operations should revert to states that users logically expect

## Text Input Patterns

### Pattern A: Blur and Enter Confirmation

Best for single-line text inputs where users expect to "commit" their changes.

```typescript
const textAtom = new Atom("");

// Update value immediately for live preview/validation
input.addEventListener('input', (e) => {
  textAtom.value = e.target.value; // Only emits "change"
});

// Save to history on completion
input.addEventListener('blur', () => {
  textAtom.emit('addHistory'); // User finished editing
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    textAtom.emit('addHistory'); // User confirmed with Enter
    input.blur(); // Optional: remove focus
  }
});
```

### Pattern B: Debounced History

Best for search inputs or auto-save scenarios where immediate feedback is needed but history should be saved after typing pauses.

```typescript
const searchAtom = new Atom("");
let timeoutId: number;

input.addEventListener('input', (e) => {
  // Update immediately for live search results
  searchAtom.value = e.target.value;

  // Clear previous timeout
  clearTimeout(timeoutId);

  // Save to history after user stops typing
  timeoutId = setTimeout(() => {
    searchAtom.emit('addHistory');
  }, 500); // 500ms delay
});

// Also save on blur to catch incomplete typing sessions
input.addEventListener('blur', () => {
  clearTimeout(timeoutId);
  searchAtom.emit('addHistory');
});
```

### Pattern C: Multi-line Text with Explicit Save

Best for text areas or code editors where content is substantial and users expect explicit save actions.

```typescript
const documentAtom = new Atom("");

// Update value immediately for live character count, etc.
textarea.addEventListener('input', (e) => {
  documentAtom.value = e.target.value;
});

// Save to history only on explicit actions
saveButton.addEventListener('click', () => {
  documentAtom.emit('addHistory'); // Explicit save action
});

// Auto-save with longer debounce for safety
let autoSaveTimeout: number;
textarea.addEventListener('input', (e) => {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    documentAtom.emit('addHistory'); // Auto-save after 2 seconds
  }, 2000);
});
```

## Selection Patterns

### Single Selection (select, radio, checkbox)

Selection changes are typically discrete user actions that should be immediately saved to history.

```typescript
const selectionAtom = new Atom("option1");

// For select elements
select.addEventListener('change', (e) => {
  selectionAtom.value = e.target.value;
  selectionAtom.emit('addHistory'); // Selection is complete action
});

// For radio buttons
document.querySelectorAll('input[name="options"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectionAtom.value = e.target.value;
      selectionAtom.emit('addHistory'); // Radio selection is final
    }
  });
});

// For single checkbox
const enabledAtom = new Atom(false);
checkbox.addEventListener('change', (e) => {
  enabledAtom.value = e.target.checked;
  enabledAtom.emit('addHistory'); // Toggle is complete action
});
```

### Multiple Selection (checkbox groups)

Multiple selections require different strategies depending on whether individual changes or batch changes should be tracked.

```typescript
const selectedItemsAtom = new Atom<string[]>([]);

// Pattern A: Save history after each individual change
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const value = e.target.value;
    const currentSelection = [...selectedItemsAtom.value];

    if (e.target.checked) {
      currentSelection.push(value);
    } else {
      const index = currentSelection.indexOf(value);
      if (index > -1) currentSelection.splice(index, 1);
    }

    selectedItemsAtom.value = currentSelection;
    selectedItemsAtom.emit('addHistory'); // Each selection is tracked
  });
});

// Pattern B: Batch changes with apply button
const tempSelection = new Set<string>();

document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    // Update temporary state immediately for UI feedback
    if (e.target.checked) {
      tempSelection.add(e.target.value);
    } else {
      tempSelection.delete(e.target.value);
    }

    // Update atom for immediate UI reflection
    selectedItemsAtom.value = Array.from(tempSelection);
    // Note: No addHistory here - waiting for batch completion
  });
});

applyButton.addEventListener('click', () => {
  // Finalize the batch selection
  selectedItemsAtom.emit('addHistory'); // Save complete batch operation
});
```

## Range and Slider Patterns

### Standard Slider Pattern

The classic pattern for continuous controls where intermediate values should not create history entries.

```typescript
const valueAtom = new Atom(50);

// During drag: Update value for immediate visual feedback
slider.addEventListener('input', (e) => {
  valueAtom.value = parseInt(e.target.value); // Live update, no history
});

// On release: Save the final value to history
slider.addEventListener('change', (e) => {
  valueAtom.emit('addHistory'); // Final value after drag ends
});
```

### Color Picker Pattern

Similar to sliders but may need additional handling for different interaction methods.

```typescript
const colorAtom = new Atom("#ff0000");

// For live color preview during selection
colorPicker.addEventListener('input', (e) => {
  colorAtom.value = e.target.value; // Live preview
});

// Save final color choice
colorPicker.addEventListener('change', (e) => {
  colorAtom.emit('addHistory'); // Final color selection
});

// If using a custom color picker with mouse events
let isDragging = false;

colorCanvas.addEventListener('mousedown', () => {
  isDragging = true;
});

colorCanvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const color = getColorFromEvent(e); // Your color calculation
    colorAtom.value = color; // Live update during drag
  }
});

colorCanvas.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    colorAtom.emit('addHistory'); // Save when drag ends
  }
});
```

## Complex UI Patterns

### Drag and Drop Operations

For drag-and-drop interfaces, save history when the entire operation completes.

```typescript
const listOrderAtom = new Atom<string[]>(["item1", "item2", "item3"]);

// During drag: Update for visual feedback
dragContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  // Visual feedback during drag
});

// On drop: Update immediately and save to history
dragContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const newOrder = calculateNewOrder(e); // Your reordering logic

  listOrderAtom.value = newOrder; // Update immediately
  listOrderAtom.emit('addHistory'); // Save completed reorder operation
});
```

### Form with Multiple Fields

For forms with multiple related fields, you can choose between per-field or per-form history strategies.

```typescript
// Strategy A: Per-field history (good for independent fields)
const nameAtom = new Atom("");
const emailAtom = new Atom("");
const ageAtom = new Atom(0);

nameInput.addEventListener('blur', () => {
  nameAtom.emit('addHistory'); // Independent field completion
});

emailInput.addEventListener('blur', () => {
  emailAtom.emit('addHistory'); // Independent field completion
});

// Strategy B: Form-level history (good for related fields)
const formAtom = new Atom({ name: "", email: "", age: 0 });

// Update immediately for validation feedback
[nameInput, emailInput, ageInput].forEach(input => {
  input.addEventListener('input', () => {
    formAtom.value = {
      name: nameInput.value,
      email: emailInput.value,
      age: parseInt(ageInput.value) || 0
    };
    // No addHistory here - waiting for form completion
  });
});

// Save history only on form submission or significant milestones
form.addEventListener('submit', (e) => {
  e.preventDefault();
  formAtom.emit('addHistory'); // Complete form submission
});

// Optional: Save on section completion for long forms
sectionCompleteButton.addEventListener('click', () => {
  formAtom.emit('addHistory'); // Section milestone
});
```

## Best Practices

### 1. User Expectation Alignment

Design history points around what users would naturally expect to undo:

```typescript
// ✅ Good: Undo reverts to previous meaningful state
slider.addEventListener('change', () => {
  sliderAtom.emit('addHistory'); // User expects to undo to before this drag
});

// ❌ Bad: Undo reverts to arbitrary intermediate state
slider.addEventListener('input', () => {
  sliderAtom.emit('addHistory'); // Creates too many meaningless undo points
});
```

### 2. Performance Considerations

Avoid high-frequency history events:

```typescript
// ✅ Good: Debounced or event-based history
const debouncedHistory = debounce(() => {
  atom.emit('addHistory');
}, 300);

// ❌ Bad: High-frequency history creation
setInterval(() => {
  atom.emit('addHistory'); // Excessive history overhead
}, 16); // 60fps - too frequent
```

### 3. Bidirectional Data Binding

Ensure UI elements reflect external atom changes by implementing complete bidirectional binding:

```typescript
// ✅ Complete bidirectional binding pattern
const textAtom = new Atom("initial value");
const input = document.getElementById('myInput') as HTMLInputElement;

// 1. User input → Atom (UI to State)
input.addEventListener('input', (e) => {
  textAtom.value = e.target.value; // Update atom from user input
});

// 2. Atom → UI (State to UI) - Critical for external updates
textAtom.on('change', (args) => {
  input.value = args.value; // Reflect external changes to UI
});

// 3. History management
input.addEventListener('blur', () => {
  textAtom.emit('addHistory'); // Save user interaction to history
});

// Example: External atom update (from API, undo/redo, etc.)
setTimeout(() => {
  textAtom.value = "Updated from API"; // Input will automatically reflect this
}, 2000);
```

**Multi-Input Synchronization:**

```typescript
const sharedAtom = new Atom("shared value");
const inputs = document.querySelectorAll('.synchronized-input') as NodeListOf<HTMLInputElement>;

inputs.forEach((input, index) => {
  // User input → Atom
  input.addEventListener('input', (e) => {
    sharedAtom.value = e.target.value;
  });

  // Atom → All inputs (external updates, other input changes)
  sharedAtom.on('change', (args) => {
    // Update all inputs except the currently focused one
    if (document.activeElement !== input) {
      input.value = args.value;
    }
  });

  // History from any input
  input.addEventListener('blur', () => {
    sharedAtom.emit('addHistory');
  });
});

// Now all inputs stay synchronized, and external updates work correctly
```

### 4. Consistent Team Patterns

Establish team conventions for common UI patterns using utility functions:

```typescript
// Team utility function for consistent text input handling with bidirectional binding
function createTextInputBinding(atom: Atom<string>, input: HTMLInputElement,
                               mode: 'blur' | 'enter' | 'debounce' = 'blur') {
  // 1. User input → Atom (UI to State)
  input.addEventListener('input', (e) => {
    atom.value = e.target.value;
  });

  // 2. Atom → UI (State to UI) - Handle external updates
  atom.on('change', (args) => {
    input.value = args.value;
  });

  // 3. History management based on mode
  switch (mode) {
    case 'blur':
      input.addEventListener('blur', () => atom.emit('addHistory'));
      break;
    case 'enter':
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          atom.emit('addHistory');
        }
      });
      break;
    case 'debounce':
      let timeout: number;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => atom.emit('addHistory'), 300);
      });
      break;
  }
}

// Usage examples
const nameAtom = new Atom("John");
const emailAtom = new Atom("john@example.com");
const searchAtom = new Atom("");

createTextInputBinding(nameAtom, nameInput, 'blur');
createTextInputBinding(emailAtom, emailInput, 'enter');
createTextInputBinding(searchAtom, searchInput, 'debounce');

// External updates will automatically reflect in all bound inputs
setTimeout(() => {
  nameAtom.value = "Jane"; // nameInput will automatically update
}, 1000);
```

**Range/Slider Utility:**

```typescript
function createRangeBinding(atom: Atom<number>, range: HTMLInputElement) {
  // User interaction → Atom
  range.addEventListener('input', (e) => {
    atom.value = parseInt(e.target.value);
  });

  // Atom → UI (external updates)
  atom.on('change', (args) => {
    range.value = args.value.toString();
  });

  // History on drag end
  range.addEventListener('change', () => {
    atom.emit('addHistory');
  });
}
```

**Selection Utility:**

```typescript
function createSelectBinding(atom: Atom<string>, select: HTMLSelectElement) {
  // User selection → Atom
  select.addEventListener('change', (e) => {
    atom.value = e.target.value;
    atom.emit('addHistory'); // Immediate history for selections
  });

  // Atom → UI (external updates)
  atom.on('change', (args) => {
    select.value = args.value;
  });
}
```

## Common Pitfalls

### 1. Forgetting to Emit History Events

**Problem**: Changes occur but no undo points are created.

**Solution**: Use development tools or tests to verify history behavior:

```typescript
// Test that verifies history is created
test('slider creates history on change', () => {
  const atom = new Atom(0);
  const container = new AtomContainer({ useHistory: true });

  // Simulate slider change
  atom.value = 50;
  atom.emit('addHistory');

  // Verify history was created
  expect(container.canUndo()).toBe(true);
});
```

### 2. Too Frequent History Events

**Problem**: Undo/redo becomes unusable due to too many intermediate states.

**Solution**: Consolidate related operations:

```typescript
// ❌ Bad: Each keystroke creates history
input.addEventListener('input', () => {
  atom.value = input.value;
  atom.emit('addHistory'); // Too frequent
});

// ✅ Good: Complete editing session creates history
input.addEventListener('blur', () => {
  atom.emit('addHistory'); // Appropriate frequency
});
```

### 3. Inconsistent History Timing

**Problem**: Similar UI elements behave differently for history.

**Solution**: Create standardized binding functions for each UI element type and use them consistently:

```typescript
// Create a binding library for your application
const UIBindings = {
  textInput: (atom: Atom<string>, input: HTMLInputElement) =>
    createTextInputBinding(atom, input, 'blur'),

  searchInput: (atom: Atom<string>, input: HTMLInputElement) =>
    createTextInputBinding(atom, input, 'debounce'),

  numberRange: (atom: Atom<number>, range: HTMLInputElement) =>
    createRangeBinding(atom, range),

  selection: (atom: Atom<string>, select: HTMLSelectElement) =>
    createSelectBinding(atom, select),
};

// Usage: Consistent patterns enforced by code, not documentation
UIBindings.textInput(nameAtom, nameInput);
UIBindings.searchInput(filterAtom, searchInput);
UIBindings.numberRange(volumeAtom, volumeSlider);
UIBindings.selection(categoryAtom, categorySelect);

// This eliminates human error and ensures team consistency
```

---

This guide covers the most common UI integration patterns for StateAtoms history management. For additional information, refer to the main StateAtoms documentation.
