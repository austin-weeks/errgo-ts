/**
 * Object containing *either* a value or an error.
 *
 * `Result` is a discriminated union, meaning that only one property (`val` or `err`)
 * will be present at a time, while the other property is undefined.
 *
 * @example
 * // Using a returned Result object
 * const res = tryCatch(() => foo());
 * if (res.err) { // case of { err: Error }
 *   console.error(res.err);
 * } else { // case of { val: T }
 *   bar(res.val);
 * }
 *
 * // Returning a Result object
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return { err: new Error("Cannot divide by zero") };
 *   } else {
 *     return { val: a / b };
 *   }
 * }
 */
export type Result<T, E = Error> =
  | { val: T; err?: undefined }
  | { err: E; val?: undefined };

/**
 * Any type that is not a Promise.
 */
export type NotPromise<T, U = unknown> = T extends Promise<U> ? never : T;
