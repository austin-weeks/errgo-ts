/**
 * Ensures an unknown value is an `Error` instance, converting it if needed.
 *
 * @param e - unknown value to treat as an error.
 * @returns e if already an Error, otherwise creates a new Error with e as the cause.
 *
 * @example
 * } catch (e: unknown) {
 *   // err is guaranteed to be an Error instance
 *   const err = ensureError(e);
 * }
 */
export function ensureError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }

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
