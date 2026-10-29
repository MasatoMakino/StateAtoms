/**
 * Tracks whether an AtomContainer has called `connectMemberAtoms()`, and
 * warns when an operation runs before that call. Each instance warns at most
 * once.
 *
 * @since 0.1.5
 */
export class InitValidationHelper {
  private _isInitialized = false;
  private _hasWarned = false;
  private readonly _containerName: string;

  /**
   * @param containerName - The class name that the warning message shows
   */
  constructor(containerName: string = "AtomContainer") {
    this._containerName = containerName;
  }

  /**
   * Marks the container as initialized. `connectMemberAtoms()` calls this
   * method.
   */
  markInitialized(): void {
    this._isInitialized = true;
  }

  /**
   * Warns through `console.warn` if `markInitialized()` has not run. Each
   * instance warns only once.
   *
   * @param operationName - The operation name that the warning message shows
   */
  validateInitialized(operationName: string): void {
    if (!this._isInitialized && !this._hasWarned) {
      console.warn(
        `${this._containerName}.${operationName}() was called before connectMemberAtoms(). ` +
          `This may cause event system failures. ` +
          `Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.`,
      );
      this._hasWarned = true;
    }
  }

  /**
   * Lets the next `validateInitialized()` call warn again. This method is
   * mainly for tests.
   */
  resetWarningState(): void {
    this._hasWarned = false;
  }

  /**
   * Whether `markInitialized()` has run. Reading it does not warn.
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }
}
