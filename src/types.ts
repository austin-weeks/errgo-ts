/**
 * Object containing *either* a value or an error.
 *
 * `Result` is a discriminated union, meaning that only one property (`val` or `err`)
 * will be present at a time, while the other property is undefined.
 *
 * ## Consuming a `Result`
 *
 * ```typescript
 * const res = safeTry(() => foo());
 * if (res.err) {
 *   console.error(res.err);
 * } else {
 *   bar(res.val);
 * }
 * ```
 *
 *
 * ## Returning a `Result`
 *
 * You can also use `Result` as the return type of your own functions and customize the `err` variant:
 *
 * ```typescript
 * type DivisionError = "divide-by-zero" | "negative-divisor";
 *
 * function divide(a: number, b: number): Result<number, DivisionError> {
 *   if (b === 0) {
 *     return { err: "divide-by-zero" };
 *   }
 *   if (b < 0) {
 *     return { err: "negative-divisor" };
 *   }
 *   return { val: a / b };
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { val: T; err?: undefined }
  | { err: E; val?: undefined };

/**
 * Any type that is not a Promise.
 */
export type NotPromise<T, U = unknown> = T extends Promise<U> ? never : T;
