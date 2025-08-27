[![Tests](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml/badge.svg)](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml)

_Forgo your error woes with ErrGo's ergonomic error handling!_

# ↫ ErrGo

A lightweight, drop-in TypeScript library for ergonomic error handling, inspired by the errors-as-values philosophy and patterns of Go and Rust.

ErrGo works harmoniously with TypeScript's built-in error handling, addressing its pain points and rough edges. It does _not_ try to ban exceptions or try/catch blocks from your codebase.

## Installation

```shell
# pnpm
pnpm add errgo-ts
# npm
npm install errgo-ts
# yarn
yarn add errgo-ts
```

## Features

### `tryCatch` - errors-as-values try/catch wrapper

Execute functions safely and get structured results instead of throwing errors. Works seamlessly with both synchronous and asynchronous functions.

```typescript
import { tryCatch } from "errgo-ts";

// Sync usage
const fileResult = tryCatch(() => fs.readFileSync("file.txt", "utf-8"));
if (fileResult.err) {
  console.error("Failed to read file:", fileResult.err);
  return "";
}
return fileResult.val;

// Async usage
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

### `propagateError` - declarative error propagation

Add context to errors without verbose try/catch blocks while preserving the original cause chain.

```typescript
// Instead of this verbose pattern...
let data;
try {
  data = getData();
} catch (e) {
  throw new Error("Failed to get data", { cause: e });
}

// ...use propagateError!
import { propagateError } from "errgo-ts";

const data = propagateError("Failed to get data", () => getData());

// Also supports async operations
const userData = await propagateError("Failed to fetch posts", async () => {
  const resp = await fetch("/api/posts");
  return resp.json();
});
```

### `ensureError` - no more unknown catches

Guarantee you're working with Error instances, even when catching unknown values. Handles all the weird ways JavaScript allows throwing non-Error objects.

```typescript
import { ensureError } from "errgo-ts";

try {
  // JavaScript allows throwing any object
  throw "i'm throwing a string!";
  // TypeScript can't know the type of caught values
} catch (e: unknown) {
  const error = ensureError(e); // Always returns an Error instance
  console.error(error.message);
  // "Non-Error object was thrown: i'm throwing a string!"
}
```

### `Result` Type

A discriminated union type representing success or failure with full type safety:

```typescript
type Result<T, E = Error> =
  | { val: T; err?: undefined } // Success case
  | { err: E; val?: undefined }; // Error case
```

## More Info

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

### Handling Complex Error Scenarios

ErrGo's `tryCatch` handles edge cases that traditional try/catch struggles with:

```typescript
// Non-Error throws are safely converted
const result = tryCatch(() => {
  throw null;
  throw undefined;
  throw "string error";
  throw { custom: "error object" };
});

// Promise rejections are properly caught
const asyncResult = await tryCatch(() => Promise.reject("async error"));

// All return properly typed Result objects
if (result.err) {
  // Always an Error instance
  console.error(result.err);
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
  console.log(result.val + 3); // Prints 5
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

---
