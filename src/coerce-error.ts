/**
 * Coerce an unknown value to an `Error` instance, converting it if needed.
 *
 * @param e - unknown value to treat as an error.
 * @returns `e` unchanged if already an `Error`, otherwise converts `e` to an `Error` and sets `e` as the cause.
 *
 * In general, `safeTry` is more ergonomic than using this function directly.
 *
 * @example
 * ```typescript
 * try {
 *   ...
 * } catch (e: unknown) {
 *   const err = coerceError(e);
 *   console.assert(err instanceof Error);
 * }
 * ```
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
