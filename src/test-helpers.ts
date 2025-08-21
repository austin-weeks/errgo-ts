/* v8 ignore start */
export const JavaScriptTypesDictionary = {
  null: null,
  undefined: undefined,
  boolean: true,
  number: 1,
  NaN: NaN,
  Infinity: Infinity,
  bigint: BigInt(1),
  string: "string",
  symbol: Symbol("symbol"),
  object: {},
  array: [],
  "typed array": new Int8Array([1, 2, 3]),
  function: function () {},
  "arrow function": () => {},
  "class constructor": class Class {},
  error: new Error("error"),
} as const;

export const jsTypes = Object.values(JavaScriptTypesDictionary);
export const nonErrorTypes = jsTypes.filter((t) => !(t instanceof Error));
/* v8 ignore stop */
