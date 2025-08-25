/**
 * Tuple containing a value and an error, where one item is null and the other is not.
 * @example
 * const [val, err] = tryCatch(() => foo());
 * if (err) { // case of [null, Error]
 *   console.error(err);
 * } else { // case of [value, null]
 *   bar(val);
 * }
 */
export type ValErr<T> = [T, null] | [null, Error];

/**
 * Any type that is not a Promise.
 */
export type NotPromise<T, U = unknown> = T extends Promise<U> ? never : T;

/**
 * Any type that is not void.
 */
export type NotVoid<T> = T extends void ? never : T;
