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
 * Executes a scoped function with deferrable actions, returning a `Result` object.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred action throws, the error is logged with `console.warn` and remaining defers continue to execute.
 *
 * *`scope.safe` will ***never*** throw.*
 *
 * @param codeScope - The scoped function execute. It is passed a `defer` function that can be used to register callbacks that will be executed when the scope terminates.
 *
 * Other `scope` variations:
 * @see {@link throwing scope.throwing}
 * @see {@link handled scope.handled}
 *
 * @example
 * ```typescript
 * const result = scope.safe((defer) => {
 *   console.log("Start");
 *   defer(() => console.log("Cleanup"));
 *   console.log("Doing work...");
 *   return "OK";
 * });
 * if (!result.err) {
 *   console.log("Result:", result.val);
 * }
 * ```
 *
 * **Output:**
 *
 * ```text
 * Start
 * Doing work...
 * Cleanup
 * Result: OK
 * ```
 */
export function safe<T>(codeScope: (defer: Defer) => NotPromise<T>): Result<T>;
export function safe<T>(codeScope: (defer: Defer) => Promise<T>): Promise<Result<T>>;
export function safe<T>(
  codeScope: (defer: Defer) => T | Promise<T>
): Result<T> | Promise<Result<T>> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = codeScope((fn) => deferQueue.push(fn));
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
 * Executes a scoped function with deferrable actions, re-throwing any errors.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred action throws, the error is logged with `console.warn` and remaining defers continue to execute.
 *
 * @param codeScope - The scoped function execute. It is passed a `defer` function that can be used to register callbacks that will be executed when the scope terminates.
 * @returns the scoped function's return value
 * @throws errors thrown by the scoped function
 *
 * Other `scope` variations:
 * @see {@link safe scope.safe}
 * @see {@link handled scope.handled}
 *
 * @example
 * ```typescript
 * try {
 *   const data = scope.throwing((defer) => {
 *     console.log("Start");
 *     defer(() => console.log("Cleanup"));
 *     console.log("Doing work...");
 *     throw new Error("uh oh!");
 *   });
 *   console.log("Result:", data);
 * } catch (e) {
 *   console.error("Caught:", e);
 * }
 * ```
 *
 * **Output:**
 * ```text
 * Start
 * Doing work...
 * Cleanup
 * Caught: uh oh!
 * ```
 */
export function throwing<T>(codeScope: (defer: Defer) => NotPromise<T>): T;
export function throwing<T>(codeScope: (defer: Defer) => Promise<T>): Promise<T>;
export function throwing<T>(
  codeScope: (defer: Defer) => T | Promise<T>
): T | Promise<T> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = codeScope((fn) => deferQueue.push(fn));
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
 * Executes a scoped function with deferrable actions, calling an error handler on failure.
 *
 * Deferred actions are executed in FIFO order after the scope completes.
 * If any deferred action throws, the error is logged with `console.warn` and remaining defers continue to execute.
 *
 * *`scope.handled` will ***never*** throw.*
 *
 * @param onError - callback executed if an error is thrown
 * @param codeScope - The scoped function execute. It is passed a `defer` function that can be used to register callbacks that will be executed when the scope terminates.
 *
 * Other `scope` variations:
 * @see {@link safe scope.safe}
 * @see {@link throwing scope.throwing}
 *
 * @example
 * ```typescript
 * scope.handled(
 *   (err) => console.error("Error in scope:", err),
 *   (defer) => {
 *     console.log("Start");
 *     defer(() => console.log("Cleanup"));
 *     console.log("Doing work...");
 *     throw new Error("uh oh!");
 *   }
 * );
 * ```
 *
 * **Output:**
 * ```text
 * Start
 * Doing work...
 * Cleanup
 * Error in scope: uh oh!
 * ```
 */
export function handled(
  onError: (e: Error) => void,
  codeScope: (defer: Defer) => NotPromise<void>
): void;
export function handled(
  onError: (e: Error) => void,
  codeScope: (defer: Defer) => Promise<void>
): Promise<void>;
export function handled(
  onError: (e: Error) => void,
  codeScope: (defer: Defer) => void | Promise<void>
): void | Promise<void> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = codeScope((fn) => deferQueue.push(fn));
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
 * Execute a scoped function with deferrable actions.
 *
 * All variations support both sync and async scoped functions.
 *
 * Available Variations:
 * - `safe` - wraps errors in a `Result`
 * - `throwing` - re-throws errors
 * - `handled` - passes errors to an `onError` callback
 */
export default {
  safe,
  throwing,
  handled,
};
