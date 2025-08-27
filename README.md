[![Package Version](https://img.shields.io/npm/v/errgo-ts?logo=npm)](https://www.npmjs.org/package/errgo-ts)
![Bundle Size](https://img.shields.io/bundlephobia/min/errgo-ts)
![GitHub License](https://img.shields.io/github/license/austin-weeks/errgo-ts)
![Package Downloads](https://img.shields.io/npm/dm/errgo-ts)
![Code Coverage](https://img.shields.io/badge/coverage-100%25-dark_green)
[![Tests](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml/badge.svg)](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml)

_Forgo your error woes with ErrGo's ergonomic error handling!_

# ErrGo

A lightweight, drop-in TypeScript library for ergonomic error handling, inspired by Go and Rust.

ErrGo works harmoniously with TypeScript's built-in error handling, addressing its pain points and rough edges. It does _not_ try to ban exceptions or try/catch blocks from your codebase.

## Installation

```shell
pnpm add errgo-ts

npm install errgo-ts

yarn add errgo-ts
```

## Features

### `tryCatch` - Errors-as-values try/catch wrapper

Execute functions safely and get structured results instead of throwing errors. Works seamlessly with both synchronous and asynchronous functions.

**Sync Usage:**

```typescript
import { tryCatch } from "errgo-ts";

const result = tryCatch(() => fs.readFileSync("file.txt", "utf-8"));
if (result.err) {
  console.error("Failed to read file:", result.err);
  return "";
}
return result.val;
```

**Async Usage:**

```typescript
import { tryCatch } from "errgo-ts";

const result = await tryCatch(async () => {
  const resp = await fetch("/api/data");
  const json = await resp.json();
  return processData(json);
});
if (result.err) {
  throw new Error("Could not fetch data", { cause: result.err });
}
return result.val;
```

### `propagateError` - Declarative error propagation

Add context to errors without verbose try/catch blocks while preserving the original cause chain.

_Instead of this verbose pattern..._

```typescript
let data;
try {
  data = getData();
} catch (e) {
  throw new Error("Failed to get data", { cause: e });
}
```

_...use `propagateError`!_

```typescript
import { propagateError } from "errgo-ts";

const data = propagateError("Failed to get data", () => getData());
```

### `ensureError` - No more unknown catches

Guarantee you're working with Error instances, even when catching unknown values. Handles all the weird ways JavaScript allows throwing non-Error objects.

```typescript
import { ensureError } from "errgo-ts";

try {
  throw "i'm throwing a string!";
} catch (e: unknown) {
  const error = ensureError(e); // Always returns an Error instance
  console.error(error.message); // "Non-Error object was thrown: i'm throwing a string!"
}
```

### `Result` Type

A discriminated union representing success or failure with full type safety:

```typescript
type Result<T, E = Error> =
  | { val: T; err?: undefined }
  | { err: E; val?: undefined };

const success: Result = { val: 2 };
const failure: Result = { err: new Error() };
```

## More Information

### Error Cause Chain Preservation

Both `propagateError` and `ensureError` preserve the original error in the cause chain, making debugging much easier:

```typescript
try {
  const data = propagateError("Failed to get data", () => {
    throw new Error("Network timeout");
  });
} catch (error) {
  console.log(error.message); // "Failed to get data"
  console.log(error.cause?.message); // "Network timeout"
}
```

### JavaScript's Error Edge Cases

ErrGo's `tryCatch` handles edge cases that are not always obvious with traditional try/catch:

```typescript
// Non-Error throws are safely converted
const result = tryCatch(() => {
  throw null;
  throw undefined;
  throw "string error";
  throw { custom: "error object" };
});
if (result.err) {
  console.log(result.err instanceof Error); // true
}

// Promise rejections are properly coverted to Error instances
const result = await tryCatch(() => Promise.reject("async error"));
if (result.err) {
  console.log(result.err instanceof Error); // true
}
```

### Type-Safe Error Handling

The `Result` type leverages TypeScript's type system to force the user to check for an error before using the returned value:

```typescript
// { val: number | undefined, err: Error | undefined }
const result = tryCatch(() => 2);

if (result.err) {
  // TypeScript knows val is undefined and err is an Error
  // { val: undefined, err: Error }
  console.error(result.err.message);
} else {
  // TypeScript knows err is undefined and val is a number
  // { val: number, err: undefined }
  console.log(result.val + 3);
}
```

### Export Options

ErrGo provides flexible import options:

```typescript
// Named imports (recommended)
import { tryCatch, propagateError, ensureError } from "errgo-ts";

// Default import
import errgo from "errgo-ts";
const result = errgo.tryCatch(() => foo());
```
