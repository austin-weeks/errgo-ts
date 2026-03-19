import { coerceError } from "./coerce-error";
import type { NotPromise, Result } from "./types";

/**
 * Execute a function, returning a `Result` object containing either the function's
 * return value if successful, or an error if it throws.
 *
 * Supports both sync and async functions.
 *
 * *`safeTry` will ***never*** throw.*
 *
 * @param fn - function to execute
 *
 * @example
 *
 * ## Sync usage
 *
 * ```typescript
 * const res = safeTry(() => thisMightThrow());
 * if (res.err) {
 *   console.error("It failed:", res.err);
 *   return;
 * }
 * doSomethingElse(res.val);
 * ```
 *
 * ## Async usage
 *
 * ```typescript
 * const usersRes = await safeTry(() => fetch("/api/users").then((r) => r.json()));
 * if (usersRes.err) {
 *   displayErrorMsg("Failed to fetch users");
 *   return;
 * }
 * doSomethingWithUsers(usersRes.val);
 * ```
 */
export function safeTry<T>(fn: () => NotPromise<T>): Result<T>;
export function safeTry<T>(fn: () => Promise<T>): Promise<Result<T>>;
export function safeTry<T>(
  fn: () => T | Promise<T>
): Result<T> | Promise<Result<T>> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (v) => ({
          val: v,
        }),
        (e) => ({
          err: coerceError(e),
        })
      );
    } else {
      return { val: result };
    }
  } catch (e: unknown) {
    return { err: coerceError(e) };
  }
}
