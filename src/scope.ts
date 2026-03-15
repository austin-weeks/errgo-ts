import { coerceError } from "./coerce-error";
import type { NotPromise, Result } from "./types";

/**
 * Registers a callback for execution after the scope terminates.
 */
type Defer = (fn: () => void) => void;
type DeferredCallback = () => void;

function executeDefers(queue: DeferredCallback[]) {
  for (let i = 0; i < queue.length; i++) {
    try {
      queue[i]();
    } catch (e: unknown) {
      console.warn("Error thrown by deferred callback:", e);
    }
  }
}

/**
 * Executes a scoped function with deferred actions, returning a `Result` object.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred function throws, the error is printed to the console and remaining defers continue to execute.
 *
 * *This function will ***never*** throw.*
 *
 * @param fn - The sync or async function to execute. It is passed a `defer` function that can be used to register callbacks to be executed when the scope terminates.
 * @returns `Result` object containing your function's returned value if successful, or an error if it throws.
 *
 * Other versions:
 * @see {@link throwing scope.throwing}
 * @see {@link handled scope.handled}
 *
 * @example
 * const result = scope.safe((defer) => {
 *   console.log("Start");
 *   defer(() => console.log("Cleanup 1"));
 *   defer(() => console.log("Cleanup 2"));
 *   console.log("Doing work...");
 *   return "OK";
 * });
 * if (!result.err) {
 *   console.log("Result:", result.val);
 * }
 *
 * // Output:
 * // Start
 * // Doing work...
 * // Cleanup 1
 * // Cleanup 2
 * // Result: OK
 */
export function safe<T>(fn: (defer: Defer) => NotPromise<T>): Result<T>;
export function safe<T>(fn: (defer: Defer) => Promise<T>): Promise<Result<T>>;
export function safe<T>(
  fn: (defer: Defer) => T | Promise<T>
): Result<T> | Promise<Result<T>> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = fn((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (v) => {
          executeDefers(deferQueue);
          return { val: v };
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          return { err: coerceError(e) };
        }
      );
    } else {
      executeDefers(deferQueue);
      return { val: res };
    }
  } catch (e: unknown) {
    executeDefers(deferQueue);
    return { err: coerceError(e) };
  }
}

/**
 * Executes a scoped function with deferred actions, re-throwing any errors.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred function throws, the error is printed to the console and remaining defers continue to execute.
 *
 * *This function ***will*** throw if the scope throws.
 *
 * @param fn - The sync or async function to execute. It is passed a `defer` function that can be used to register callbacks to be executed when the scope terminates.
 * @returns your function's return value
 * @throws if your function throws
 *
 * Other versions:
 * @see {@link safe scope.safe}
 * @see {@link handled scope.handled}
 *
 * @example
 * try {
 *   const data = scope.throwing((defer) => {
 *     console.log("Start");
 *     defer(() => console.log("Cleanup 1"));
 *     defer(() => console.log("Cleanup 2"));
 *     console.log("Doing work...");
 *     console.log("Something goes wrong")
 *     throw new Error("ERROR");
 *   });
 *   console.log("Result:", data);
 * } catch (e) {
 *   console.error("Caught:", e);
 * }
 *
 * // Output:
 * // Start
 * // Doing work...
 * // Something goes wrong
 * // Cleanup 1
 * // Cleanup 2
 * // Caught: ERROR
 */
export function throwing<T>(fn: (defer: Defer) => NotPromise<T>): T;
export function throwing<T>(fn: (defer: Defer) => Promise<T>): Promise<T>;
export function throwing<T>(fn: (defer: Defer) => T | Promise<T>): T | Promise<T> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = fn((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (v) => {
          executeDefers(deferQueue);
          return v;
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          throw coerceError(e);
        }
      );
    } else {
      executeDefers(deferQueue);
      return res;
    }
  } catch (e: unknown) {
    executeDefers(deferQueue);
    throw coerceError(e);
  }
}

/**
 * Executes a scoped function with deferred actions, calling an error handler on failure.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred function throws, the error is printed to the console and remaining defers continue to execute.
 *
 * *This function will ***never*** throw.*
 *
 * @param onError - callback executed if an error is thrown
 * @param fn - The sync or async function to execute. It is passed a `defer` function that can be used to register callbacks to be executed when the scope terminates.
 *
 * Other versions:
 * @see {@link safe scope.safe}
 * @see {@link throwing scope.throwing}
 *
 * @example
 * scope.handled(
 *   (err) => console.error("Error in scope:", err),
 *   (defer) => {
 *     console.log("Start");
 *     defer(() => console.log("Cleanup 1"));
 *     defer(() => console.log("Cleanup 2"));
 *     console.log("Doing work...");
 *     console.log("Something goes wrong")
 *     throw new Error("ERROR");
 *   }
 * );
 *
 * // Output:
 * // Start
 * // Doing work...
 * // Something goes wrong
 * // Cleanup 1
 * // Cleanup 2
 * // Error in scope: ERROR
 */
export function handled(
  onError: (e: Error) => void,
  fn: (defer: Defer) => NotPromise<void>
): void;
export function handled(
  onError: (e: Error) => void,
  fn: (defer: Defer) => Promise<void>
): Promise<void>;
export function handled(
  onError: (e: Error) => void,
  fn: (defer: Defer) => void | Promise<void>
): void | Promise<void> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = fn((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (_) => {
          executeDefers(deferQueue);
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          onError(coerceError(e));
        }
      );
    } else {
      executeDefers(deferQueue);
    }
  } catch (e) {
    executeDefers(deferQueue);
    onError(coerceError(e));
  }
}

/**
 * Execute functions with deferred actions.
 *
 * Available execution modes:
 * - `safe` - wraps errors in a `Result` type
 * - `throwing` - re-throws errors from the scope
 * - `handled` - passes errors to a provided callback function
 */
export default {
  safe,
  throwing,
  handled,
};
