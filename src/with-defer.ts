import type { NonPromise, NonVoid, ValErr } from "./types";
import { handleUnknown, wrapError } from "./utils";

type OnError = (e: Error) => void;
type Action<T> = (defer: (cb: () => void | Promise<void>) => void) => T;

// One issue with the overloads for non-void is that they don't allow returning undefined...

export function withDefer<T>(
  action: Action<NonPromise<NonVoid<T>>>
): ValErr<NonPromise<NonVoid<T>>>;
export function withDefer<T>(
  action: Action<Promise<NonVoid<T>>>
): Promise<ValErr<NonVoid<T>>>;

export function withDefer<T>(
  action: Action<T | Promise<T>>
): ValErr<T> | Promise<ValErr<T>> {
  return _withDeferImpl(action) as ValErr<T> | Promise<ValErr<T>>;
}

export namespace withDefer {
  export function handled(onError: OnError, action: Action<undefined>): void;
  export function handled(
    onError: OnError,
    action: Action<Promise<void>>
  ): Promise<void>;
  // v8 coverage tool has a hard time detecting that the implementation function is covered...
  /* v8 ignore start */
  export function handled(
    onError: OnError,
    action: Action<void | Promise<void>>
  ): void | Promise<void> {
    return _withDeferImpl(action, onError) as void | Promise<void>;
  }
  /* v8 ignore end */
}

function _withDeferImpl<T>(
  action: Action<T | Promise<T>>,
  onError?: OnError
): ValErr<T> | Promise<ValErr<T>> | void | Promise<void> {
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
            return [val, null] as [T, null];
          },
          (e: unknown) => {
            executeDefers();
            return [null, handleUnknown(e)] as [null, Error];
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
