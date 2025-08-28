import type { NotPromise, Result } from "./types.js";
import { ensureError } from "./utils.js";

type Action<T> = (defer: Defer) => T;
type Defer = (defferedFn: () => void) => void;
type DeferredCallback = () => void;

function executeDefers(queue: DeferredCallback[]) {
  for (let i = 0; i < queue.length; i++) {
    try {
      queue[i]();
    } catch (e: unknown) {
      console.warn("Error in deferred callback:", e);
    }
  }
}

/**
 * Executes a function with deferred cleanup actions, returning a `Result` object.
 *
 * Defers are executed in FIFO order after the action completes (whether it succeeds or fails).
 * If any deferred function throws, it logs a warning but continues executing remaining defers.
 *
 * *This function will ***never*** throw.*
 *
 * @param action - function that receives a `defer` callback to register cleanup actions
 * @returns `{ val: T }` if action succeeds, `{ err: Error }` if action fails
 * @example
 * // Basic usage with file operations
 * const res = defer.safe((defer) => {
 *   const file = fs.openSync("data.txt", "r");
 *   defer(() => fs.closeSync(file)); // cleanup will run after action
 *
 *   const data = fs.readFileSync(file, "utf-8");
 *   return data;
 * });
 *
 * @example
 * // Async usage with database connections
 * const res = await defer.safe(async (defer) => {
 *   const conn = await db.connect();
 *   defer(() => conn.close()); // cleanup runs after async action
 *
 *   const result = await conn.query("SELECT * FROM users");
 *   return result;
 * });
 *
 * @example
 * // Multiple defers in nested contexts
 * const res = defer.safe((defer) => {
 *   const file1 = fs.openSync("file1.txt", "r");
 *   defer(() => fs.closeSync(file1));
 *
 *   defer.safe((defer) => {
 *     const file2 = fs.openSync("file2.txt", "r");
 *     defer(() => fs.closeSync(file2));
 *     // file2 closes first, then file1
 *   });
 *
 *   return "success";
 * });
 */
export function safe<T>(action: Action<NotPromise<T>>): Result<T>;
export function safe<T>(action: Action<Promise<T>>): Promise<Result<T>>;
export function safe<T>(
  action: Action<T | Promise<T>>
): Result<T> | Promise<Result<T>> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = action((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (v) => {
          executeDefers(deferQueue);
          return { val: v };
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          return { err: ensureError(e) };
        }
      );
    } else {
      executeDefers(deferQueue);
      return { val: res };
    }
  } catch (e: unknown) {
    executeDefers(deferQueue);
    return { err: ensureError(e) };
  }
}

/**
 * Executes a function with deferred cleanup actions, re-throwing any errors.
 *
 * Defers are executed in FIFO order after the action completes (whether it succeeds or fails).
 * If any deferred function throws, it logs a warning but continues executing remaining defers.
 *
 * *This function ***will*** throw if the action throws.*
 *
 * @param action - function that receives a `defer` callback to register cleanup actions
 * @returns the action's return value
 * @throws errors thrown by the action
 * @example
 * // Basic usage - errors are re-thrown
 * try {
 *   const data = defer.throwing((defer) => {
 *     const file = fs.openSync("data.txt", "r");
 *     defer(() => fs.closeSync(file));
 *
 *     if (!data) throw new Error("No data found");
 *     return data;
 *   });
 * } catch (e) {
 *   // file is guaranteed to be closed, even if error occurred
 *   console.error("Failed to read data:", e);
 * }
 *
 * @example
 * // Async usage with error propagation
 * const data = await defer.throwing(async (defer) => {
 *   const conn = await db.connect();
 *   defer(() => conn.close());
 *
 *   const result = await conn.query("SELECT * FROM users");
 *   if (!result) throw new Error("No users found");
 *   return result;
 * });
 */
export function throwing<T>(action: Action<NotPromise<T>>): T;
export function throwing<T>(action: Action<Promise<T>>): Promise<T>;
export function throwing<T>(action: Action<T | Promise<T>>): T | Promise<T> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = action((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (v) => {
          executeDefers(deferQueue);
          return v;
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          throw ensureError(e);
        }
      );
    } else {
      executeDefers(deferQueue);
      return res;
    }
  } catch (e: unknown) {
    executeDefers(deferQueue);
    throw ensureError(e);
  }
}

/**
 * Executes a function with deferred cleanup actions, calling an error handler on failure.
 *
 * Defers are executed in FIFO order after the action completes (whether it succeeds or fails).
 * If any deferred function throws, it logs a warning but continues executing remaining defers.
 *
 * *This function will ***never*** throw.*
 *
 * @param onError - callback function called when the action throws an error
 * @param action - function that receives a `defer` callback to register cleanup actions
 * @returns `void` for sync actions, `Promise<void>` for async actions
 * @example
 * // Basic usage with custom error handling
 * defer.handled(
 *   (error) => console.error("Operation failed:", error),
 *   (defer) => {
 *     const file = fs.openSync("data.txt", "r");
 *     defer(() => fs.closeSync(file));
 *
 *     if (!data) throw new Error("No data found");
 *   }
 * );
 *
 * @example
 * // Async usage with structured error handling
 * await defer.handled(
 *   (error) => {
 *     logger.error("Database operation failed", { error });
 *     metrics.increment("db.error");
 *   },
 *   async (defer) => {
 *     const conn = await db.connect();
 *     defer(() => conn.close());
 *
 *     const result = await conn.query("SELECT * FROM users");
 *     if (!result) throw new Error("No users found");
 *   }
 * );
 */
export function handled<T>(
  onError: (e: Error) => void,
  action: Action<NotPromise<T>>
): T;
export function handled<T>(
  onError: (e: Error) => void,
  action: Action<Promise<T>>
): Promise<T>;
export function handled<T>(
  onError: (e: Error) => void,
  action: Action<T | Promise<void>>
): void | Promise<void> {
  const deferQueue: DeferredCallback[] = [];
  try {
    const res = action((fn) => deferQueue.push(fn));
    if (res instanceof Promise) {
      return res.then(
        (_) => {
          executeDefers(deferQueue);
        },
        (e: unknown) => {
          executeDefers(deferQueue);
          onError(ensureError(e));
        }
      );
    } else {
      executeDefers(deferQueue);
    }
  } catch (e) {
    executeDefers(deferQueue);
    onError(ensureError(e));
  }
}

/**
 * Execute a function and defer actions until execution completes.
 *
 * Available functions:
 * - `safe` - wraps errors in a `Result` type
 * - `throwing` - re-throws errors
 * - `handled` - calls provided onError callback on error
 */
export default {
  safe,
  throwing,
  handled,
};
