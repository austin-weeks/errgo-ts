/**
 * Error Helpers
 */

type Success<T> = [T, null];
type Failure = [null, Error];

type Result<T> = Success<T> | Failure;

type NonPromise<T, U = any> = T extends Promise<U> ? never : T;
type NonVoid<T> = T extends void ? never : T;

export function tryCatch<T>(action: () => NonPromise<T>): Result<T>;
export function tryCatch<T>(action: () => Promise<T>): Promise<Result<T>>;
export function tryCatch<T>(
  action: () => T | Promise<T>
): Result<T> | Promise<Result<T>> {
  try {
    const result = action();
    if (result instanceof Promise) {
      return result.then(
        (val) => [val, null],
        (e) => [null, handleUnknown(e)]
      );
    } else {
      return [result, null];
    }
  } catch (e: unknown) {
    return [null, handleUnknown(e)];
  }
}

/**
 * Alias for `runAndWrapError.
 * @see propagateError
 */
export const errorf = propagateError;

/**
 * Runs a block of code, catching any errors and re-throwing them with additional context.
 *
 * @param errorContext - Descriptive message with which to wrap and re-throw errors
 * @param action - The code block to execute
 * @returns `T` - the return value of `action`
 * @throws {Error} prefixed with the provided `errorContext`
 * @example
 * // Mimics the common Go error handling pattern
 * foo, err := getFoo()
 * if err != nil {
 *     return fmt.Errorf("Error getting foo: %w", err)
 * }
 *
 * // propagateError Usage
 * const foo = propagateError("Error getting foo", () => {
 *   return getFoo();
 * });
 *
 * // This is equivalent to
 * let foo;
 * try {
 *   foo = getFoo();
 * } catch (e) {
 *   throw new Error(`Error getting foo: ${e.message}`, { cause: e });
 * }
 */
export function propagateError<T>(errorContext: string, action: () => T): T {
  try {
    return action();
  } catch (e: unknown) {
    const err = handleUnknown(e);
    throw wrapError(errorContext, err);
  }
}

type OnError = (e: Error) => void;
type Action<T> = (defer: (cb: () => void | Promise<void>) => void) => T;

export function withDefer<T>(
  action: Action<NonPromise<NonVoid<T>>>
): Result<NonPromise<NonVoid<T>>>;
export function withDefer<T>(
  action: Action<Promise<NonVoid<T>>>
): Promise<Result<NonVoid<T>>>;

export function withDefer<T>(
  action: Action<T | Promise<T>>
): Result<T> | Promise<Result<T>> {
  return _withDeferImpl(action) as Result<T> | Promise<Result<T>>;
}
//
export namespace withDefer {
  // Sync overload
  export function handled(onError: OnError, action: Action<undefined>): void;

  // Async overload
  export function handled(
    onError: OnError,
    action: Action<Promise<void>>
  ): Promise<void>;

  // Implementation
  export function handled(
    onError: OnError,
    action: Action<void | Promise<void>>
  ): void | Promise<void> {
    return _withDeferImpl(action, onError) as void | Promise<void>;
  }
}

function _withDeferImpl<T>(
  action: Action<T | Promise<T>>,
  onError?: OnError
): Result<T> | Promise<Result<T>> | void | Promise<void> {
  type DeferredCallback = () => void | Promise<void>;
  const deferQueue: DeferredCallback[] = [];
  function defer(cb: DeferredCallback) {
    deferQueue.push(cb);
  }

  const executeDefers = () => {
    while (deferQueue.length > 0) {
      try {
        const deferredAction = deferQueue.shift();
        const result = deferredAction?.();
        if (result instanceof Promise) {
          result.catch((e) =>
            console.warn(wrapError("Error in async deferred callback", e))
          );
        }
      } catch (e) {
        console.warn(wrapError("Error in deferred callback", e));
      }
    }
  };

  try {
    const result = action(defer);

    if (onError) {
      if (result instanceof Promise) {
        return result.then(
          () => {
            executeDefers();
          },
          (e) => {
            executeDefers();
            onError(handleUnknown(e));
          }
        );
      } else {
        executeDefers();
        return;
      }
    } else {
      if (result instanceof Promise) {
        return result.then(
          (val) => {
            executeDefers();
            return [val, null] as Success<T>;
          },
          (e) => {
            executeDefers();
            return [null, handleUnknown(e)] as Failure;
          }
        );
      } else {
        executeDefers();
        return [result!, null];
      }
    }
  } catch (e: unknown) {
    const err = handleUnknown(e);
    executeDefers();
    if (onError) {
      onError(err);
    } else {
      return [null, err];
    }
  }
}

/**
 *
 * @param e - unknown value to treat as an error
 * @returns `e` if `e` is an `Error` instance, otherwise returns a new `Error` with `e` as the cause.
 */
export function handleUnknown(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  } else {
    const eString = (() => {
      if (e === null) return "null";
      if (typeof e === "object") {
        try {
          return JSON.stringify(e);
        } catch {
          return String(e);
        }
      } else {
        return String(e);
      }
    })();

    return new Error(`Non-Error object was thrown: ${eString}`, { cause: e });
  }
}

function wrapError(context: string, error: unknown): Error {
  const err = handleUnknown(error);
  return new Error(`${context}: ${err.message}`, { cause: err });
}
