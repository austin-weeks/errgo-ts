import type { NonPromise, ValErr } from "./types";
import { handleUnknown } from "./utils";

export function tryCatch<T>(action: () => NonPromise<T>): ValErr<T>;
export function tryCatch<T>(action: () => Promise<T>): Promise<ValErr<T>>;
export function tryCatch<T>(
  action: () => T | Promise<T>
): ValErr<T> | Promise<ValErr<T>> {
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
