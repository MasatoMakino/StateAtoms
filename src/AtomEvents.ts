import type { AtomEventArgs } from "./AtomEventArgs.js";

/**
 * Events that Atoms and AtomContainers emit. A container re-emits the
 * `beforeChange`, `change`, and `addHistory` events of its members.
 *
 * @template T - The type of value held by the atom
 *
 * @since 0.1.0
 */
export interface AtomEvents<T> {
  /**
   * An atom emits this event before it writes the new value.
   */
  beforeChange: (arg: AtomEventArgs<T>) => void;

  /**
   * An atom emits this event after it writes the new value.
   */
  change: (arg: AtomEventArgs<T>) => void;

  /**
   * Requests a history snapshot. Atoms do not emit this event when a value
   * changes. Application code emits it at the end of an interaction, such as
   * a drag end, a blur, or a form submission, so that one undo step matches
   * one user action. A container with history enabled adds a snapshot when
   * it receives this event.
   *
   * For the timing of each UI element, see {@link https://github.com/MasatoMakino/StateAtoms/blob/main/docs/ui-integration-patterns.md | UI Integration Patterns}.
   *
   * @example
   * ```typescript
   * const textAtom = new Atom("");
   * input.addEventListener("blur", () => {
   *   textAtom.emit("addHistory"); // Save when the user finishes editing
   * });
   * ```
   */
  addHistory: () => void;

  /**
   * Emitted by an AtomContainer after its history index or history length
   * changes. Atoms do not emit this event, and child containers do not
   * propagate it to their parent.
   *
   * `addHistory()`, `undo()`, `redo()`, and `load()` emit this event at most
   * once per call, after the container restores values. `connectMemberAtoms()`
   * also emits it when it records the initial history entry. Call
   * `canUndo()` and `canRedo()` in the listener to update UI state.
   *
   * @since 0.2.3
   *
   * @example
   * ```typescript
   * container.on("historyChange", () => {
   *   undoButton.disabled = !container.canUndo();
   *   redoButton.disabled = !container.canRedo();
   * });
   * ```
   */
  historyChange: () => void;
}
