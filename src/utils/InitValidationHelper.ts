/**
 * Helper class for managing AtomContainer initialization validation and warnings.
 *
 * This class tracks whether an AtomContainer has been properly initialized via connectMemberAtoms()
 * (or the legacy init() method) and provides helpful developer warnings when operations are called before initialization.
 * It implements smart warning deduplication to prevent console spam while still providing
 * useful debugging information.
 *
 * @example
 * ```typescript
 * class MyContainer extends AtomContainer {
 *   private _validator = new InitValidationHelper('MyContainer');
 *
 *   public connectMemberAtoms() {
 *     this._validator.markInitialized();
 *     super.connectMemberAtoms();
 *   }
 *
 *   someOperation() {
 *     this._validator.validateInitialized('someOperation');
 *     // ... operation logic
 *   }
 * }
 * ```
 *
 * @since 0.1.5
 */
export class InitValidationHelper {
  /**
   * Whether the container has been properly initialized via connectMemberAtoms() or init().
   */
  private _isInitialized = false;

  /**
   * Whether a warning has already been shown for this container instance.
   * Used to prevent duplicate warnings and console spam.
   */
  private _hasWarned = false;

  /**
   * The name of the container class for debugging purposes.
   * Displayed in warning messages to help developers identify the source.
   */
  private readonly _containerName: string;

  /**
   * Creates a new InitValidationHelper instance.
   *
   * @param containerName - The name of the container class (typically constructor.name)
   *                       Used in warning messages for better debugging experience
   */
  constructor(containerName: string = "AtomContainer") {
    this._containerName = containerName;
  }

  /**
   * Mark the container as properly initialized.
   *
   * This should be called from the container's connectMemberAtoms() method to indicate
   * that initialization is complete and operations can safely proceed.
   *
   * @example
   * ```typescript
   * public connectMemberAtoms() {
   *   this._initValidator.markInitialized();
   *   this.addMembers();
   *   this.initHistory();
   * }
   * ```
   */
  markInitialized(): void {
    this._isInitialized = true;
  }

  /**
   * Check if connectMemberAtoms() has been called and warn if not.
   *
   * This method should be called at the beginning of operations that require
   * proper initialization (like fromObject, addHistory, etc.). It will show
   * a helpful warning message only once per container instance to avoid spam.
   *
   * @param operationName - The name of the operation being called
   *                       Used in the warning message for context
   *
   * @example
   * ```typescript
   * fromObject(obj: DataType): void {
   *   this._initValidator.validateInitialized('fromObject');
   *   // ... rest of implementation
   * }
   * ```
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
   * Reset the warning state for this helper instance.
   *
   * This method is primarily useful for testing scenarios where you want
   * to verify warning behavior multiple times with the same container instance.
   *
   * @example
   * ```typescript
   * // In tests
   * helper.resetWarningState();
   * helper.validateInitialized('testOperation'); // Will warn again
   * ```
   */
  resetWarningState(): void {
    this._hasWarned = false;
  }

  /**
   * Check initialization state without triggering warnings.
   *
   * This getter allows checking whether the container has been initialized
   * without side effects. Useful for conditional logic or testing.
   *
   * @returns true if markInitialized() has been called, false otherwise
   *
   * @example
   * ```typescript
   * if (!this._initValidator.isInitialized) {
   *   throw new Error('Container not initialized');
   * }
   * ```
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }
}
