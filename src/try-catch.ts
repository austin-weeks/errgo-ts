import type { NotPromise, ValErr } from "./types";
import { ensureError } from "./utils";

/**
 * Executes a provided action, returning its value if successful or an error if it throws.
 * Supports both synchronous and asynchronous actions.
 *
 * *This function will ***never*** throw.*
 *
 * @param action - the action to execute that may throw an error
 * @returns `[null, Error]` if `action` throws, else `[T, null]`
 * @example
 * // Example Usage - Granular error handling
 * const [resp, fetchErr] = await tryCatch(() => fetch("/api/data"));
 * if (fetchErr) {
 *   throw new Error("Failed to fetch data", { cause: fetchErr });
 * }
 * const [rawData, jsonErr] = await tryCatch(() => resp.json());
 * if (jsonErr) {
 *   throw new Error("Failed to parse response body", { cause: jsonErr });
 * }
 * const [result, processErr] = tryCatch(() => processData(rawData));
 * if (processErr) {
 *   throw new Error("Failed to process data", { cause: processErr });
 * }
 * return result;
 *
 * // Equivalent granular error handling with try/catch blocks 😵‍💫
 * let resp;
 * try {
 *   resp = await fetch("/api/data")
 * } catch (e) {
 *   throw new Error("Failed to fetch data", { cause: e });
 * }
 * let rawData;
 * try {
 *   rawData = await resp.json();
 * } catch (e) {
 *   throw new Error("Failed to parse response body", { cause: e });
 * }
 * let result;
 * try {
 *   result = processData(rawData);
 * } catch (e) {
 *   throw new Error("Failed to process data", { cause: e });
 * }
 * return result;
 *
 * // Or the common (lazy) approach...
 * try {
 *   const resp = await fetch("/api/data");
 *   const rawData = await resp.json();
 *   return processData(rawData);
 * } catch (e) {
 *   throw new Error("Something went wrong", { cause: e });
 * }
 */
export function tryCatch<T>(action: () => NotPromise<T>): ValErr<T>;
export function tryCatch<T>(action: () => Promise<T>): Promise<ValErr<T>>;
export function tryCatch<T>(
  action: () => T | Promise<T>
): ValErr<T> | Promise<ValErr<T>> {
  try {
    const result = action();
    if (result instanceof Promise) {
      return result.then(
        (val) => [val, null],
        (e) => [null, ensureError(e)]
      );
    } else {
      return [result, null];
    }
  } catch (e: unknown) {
    return [null, ensureError(e)];
  }
}
