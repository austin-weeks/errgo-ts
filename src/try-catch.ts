import type { NotPromise, Result } from "./types";
import { ensureError } from "./utils";

/**
 * Executes the provided function, returning a `Result` object containing either the functions's
 * return value if successful, or its thrown error if it fails.
 *
 * Provides overloads for both synchronous and asynchronous actions.
 *
 * *This function will ***never*** throw.*
 *
 * @param action - the function to execute that may throw an error
 * @returns `{ err: Error }` if `action` throws, else `{ val: T }`
 * @example
 * // Synchronous usage
 * const res = tryCatch(() => fs.readFileSync(myFile));
 *
 * // Async usage
 * const res = await tryCatch(() => fetch("/data"));
 *
 * @example
 * // Using tryCatch for granular error handling
 * const resp = await tryCatch(() => fetch("/api/data"));
 * if (resp.err) {
 *   throw new Error("Failed to fetch data", { cause: resp.err });
 * }
 * const json = await tryCatch(() => resp.val.json());
 * if (json.err) {
 *   throw new Error("Failed to parse response body", { cause: json.err });
 * }
 * const result = tryCatch(() => processData(json.val));
 * if (result.err) {
 *   throw new Error("Failed to process data", { cause: result.err });
 * }
 * return result.val;
 *
 * // Equivalent granular error handling with try/catch blocks
 * let resp;
 * try {
 *   resp = await fetch("/api/data")
 * } catch (e) {
 *   throw new Error("Failed to fetch data", { cause: e });
 * }
 * let json;
 * try {
 *   json = await resp.json();
 * } catch (e) {
 *   throw new Error("Failed to parse response body", { cause: e });
 * }
 * let result;
 * try {
 *   result = processData(json);
 * } catch (e) {
 *   throw new Error("Failed to process data", { cause: e });
 * }
 * return result;
 */
export function tryCatch<T>(action: () => NotPromise<T>): Result<T>;
export function tryCatch<T>(action: () => Promise<T>): Promise<Result<T>>;
export function tryCatch<T>(
  action: () => T | Promise<T>
): Result<T> | Promise<Result<T>> {
  try {
    const result = action();
    if (result instanceof Promise) {
      return result.then(
        (v) => ({
          val: v,
        }),
        (e) => ({
          err: ensureError(e),
        })
      );
    } else {
      return { val: result };
    }
  } catch (e: unknown) {
    return { err: ensureError(e) };
  }
}
