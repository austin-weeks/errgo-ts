import { coerceError } from "./coerce-error";

/**
 * Execute a function while catching and re-throwing any errors with the provided context message.
 *
 * Supports both sync and async functions.
 *
 * @param errorContext - message prefix for re-thrown errors
 * @param fn - function to execute
 * @returns the function's return value
 * @throws errors thrown by the function, wrapped in the provided context
 *
 * @example
 *
 * _This..._
 * ```typescript
 * const data = propagateError("Failed to get data", () => getData());
 * ```
 * _...is equivalent to this..._
 * ```typescript
 * let data;
 * try {
 *   data = getData();
 * } catch (e) {
 *   throw new Error("Failed to get data", { cause: e });
 * }
 * ```
 */
export function propagateError<T>(errorContext: string, fn: () => T): T;
export function propagateError<T>(
  errorContext: string,
  fn: () => Promise<T>
): Promise<T>;
export function propagateError<T>(
  errorContext: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (val) => val,
        (e) => {
          const err = coerceError(e);
          throw new Error(errorContext, { cause: err });
        }
      );
    } else {
      return result;
    }
  } catch (e: unknown) {
    const err = coerceError(e);
    throw new Error(errorContext, { cause: err });
  }
}
