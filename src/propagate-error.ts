import { ensureError } from "./utils.js";

/**
 * Executes a provided action, catching and re-throwing any errors with the provided additional context.
 * This function mimics Go's fmt.errorf wrapping pattern and preserves the original error
 * in the cause chain. Supports both synchronous and asynchronous actions.
 *
 * @param errorContext - descriptive message to prefix re-thrown errors
 * @param action - the action to execute that may throw an error
 * @returns `action`'s return value
 * @throws errors thrown by `action` wrapped in the provided context
 * @example
 * // Instead of a verbose try-catch block...
 * let data;
 * try {
 *   data = getData();
 * } catch (e) {
 *   throw new Error("Failed to get data", { cause: e });
 * }
 *
 * // ...use propagateError for more declarative code
 * const data = propagateError("Failed to get data", () => {
 *   return getData();
 * });
 *
 */
export function propagateError<T>(errorContext: string, action: () => T): T;
export function propagateError<T>(
  errorContext: string,
  action: () => Promise<T>
): Promise<T>;
export function propagateError<T>(
  errorContext: string,
  action: () => T | Promise<T>
): T | Promise<T> {
  try {
    const result = action();
    if (result instanceof Promise) {
      return result.then(
        (val) => val,
        (e) => {
          const err = ensureError(e);
          throw new Error(errorContext, { cause: err });
        }
      );
    } else {
      return result;
    }
  } catch (e: unknown) {
    const err = ensureError(e);
    throw new Error(errorContext, { cause: err });
  }
}
