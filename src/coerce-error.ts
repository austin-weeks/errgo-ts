/**
 * Ensures an unknown value is an `Error` instance, converting it if needed.
 *
 * @param e - unknown value to treat as an error.
 * @returns `e` unchanged if already an Error, otherwise converts `e` to an Error.
 *
 * @example
 * } catch (e: unknown) {
 *   // err is guaranteed to be an Error instance
 *   const err = coerceError(e);
 * }
 */
export function coerceError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error(unknownToString(e), { cause: e });
}

function unknownToString(e: unknown): string {
  if (e === null) return "null";
  if (typeof e !== "object") return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
