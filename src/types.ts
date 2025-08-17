/**
 * Tuple containing a value and an error, where one item is null and the other is not.
 * @example
 * const [val, err] = tryCatch(() => foo());
 * if (err) { // case of [null, Error]
 *   console.error(err);
 *   return;
 * } else { // case of [value, null]
 *   bar(val);
 * }
 */
export type ValErr<T> = [T, null] | [null, Error];

export type NonPromise<T, U = any> = T extends Promise<U> ? never : T;
export type NonVoid<T> = T extends void ? never : T;
