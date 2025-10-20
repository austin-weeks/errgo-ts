[![Package Version](https://img.shields.io/npm/v/errgo-ts?logo=npm)](https://www.npmjs.org/package/errgo-ts)
![Bundle Size](https://img.shields.io/bundlephobia/min/errgo-ts)
![GitHub License](https://img.shields.io/github/license/austin-weeks/errgo-ts)
![Package Downloads](https://img.shields.io/npm/dm/errgo-ts)
![Code Coverage](https://img.shields.io/badge/coverage-100%25-dark_green)
[![Tests](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml/badge.svg)](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml)

_Forgo your error woes with ErrGo's ergonomic error handling!_

# ErrGo

A lightweight TypeScript library for ergonomic error handling, inspired by Go and Rust.

Offers [error handling utilities](#error-handling-utilities) and introduces the [`defer` keyword from Go](#scope---execute-functions-with-deferred-actions).

## Installation

```shell
pnpm add errgo-ts

npm install errgo-ts

yarn add errgo-ts
```

## Error Handling Utilities

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
  const resp = await fetch("/api/users");
  return await resp.json();
});
if (result.err) {
  throw new Error("Could not fetch data", { cause: result.err });
}
return result.val;
```

**Using `tryCatch` for granular error handling:**

```typescript
import { tryCatch } from "errgo-ts";

const resp = await tryCatch(() => fetch("/api/data"));
if (resp.err) {
  throw new Error("Failed to fetch data", { cause: resp.err });
}
const json = await tryCatch(() => resp.val.json());
if (json.err) {
  throw new Error("Failed to parse response body", { cause: json.err });
}
const result = tryCatch(() => processData(json.val));
if (result.err) {
  throw new Error("Failed to process data", { cause: result.err });
}
return result.val;

// Equivalent granular error handling with try/catch blocks
let resp;
try {
  resp = await fetch("/api/data");
} catch (e) {
  throw new Error("Failed to fetch data", { cause: e });
}
let json;
try {
  json = await resp.json();
} catch (e) {
  throw new Error("Failed to parse response body", { cause: e });
}
let result;
try {
  result = processData(json);
} catch (e) {
  throw new Error("Failed to process data", { cause: e });
}
return result;
```

### `coerceError` - No more unknown catches

Guarantee you're working with an Error instance. Handles all the weird ways JavaScript allows throwing non-Error objects.

```typescript
import { coerceError } from "errgo-ts";

try {
  throw "i'm throwing a string!";
} catch (e: unknown) {
  const error = coerceError(e); // Always returns an Error instance
  console.error(error.message); // "i'm throwing a string!"
}
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

### `Result` Type

A discriminated union representing success or failure with full type safety:

```typescript
type Result<T, E = Error> =
  | { val: T; err?: undefined }
  | { err: E; val?: undefined };
```

```typescript
import { Result } from "errgo-ts";

const success: Result<number> = { val: 2 };
const failure: Result<number> = { err: new Error() };
```

## `scope` - Execute functions with deferred actions

Introduces an equivalent to Go's `defer` keyword. Allows you to defer execution of functions until after the enclosing scope completes.

```typescript
import { scope } from "errgo-ts";

scope.safe((defer) => {
  defer(() => console.log("This happens last!"));
  console.log("This happens first!");
});
```

The `scope` module provides three execution modes to match different error handling strategies:

### `scope.safe` - Returns a Result object

Wraps errors in a `Result` object for explicit error handling. **Never throws**.

```typescript
const result = scope.safe((defer) => {
  console.log("Start");
  defer(() => console.log("Cleanup 1"));
  defer(() => console.log("Cleanup 2"));
  console.log("Doing work...");
  return "OK";
});
if (!result.err) {
  console.log("Result:", result.val);
}
```

**Output:**

```
Start
Doing work...
Cleanup 1
Cleanup 2
Result: OK
```

### `scope.throwing` - Re-throws errors

Returns the executed function's value and re-throws any errors.

```typescript
try {
  const data = scope.throwing((defer) => {
    console.log("Start");
    defer(() => console.log("Cleanup 1"));
    defer(() => console.log("Cleanup 2"));
    console.log("Doing work...");
    console.log("Something goes wrong");
    throw new Error("ERROR");
  });
  console.log("Result:", data);
} catch (e) {
  console.error("Caught:", e);
}
```

**Output:**

```
Start
Doing work...
Something goes wrong
Cleanup 1
Cleanup 2
Caught: ERROR
```

### `scope.handled` - Calls a provided error handler

Executes a provided callback after executing defers if an error occurs. Ideal for cases where you want declarative error handling.

```typescript
scope.handled(
  (err) => console.error("Error in scope:", err),
  (defer) => {
    console.log("Start");
    defer(() => console.log("Cleanup 1"));
    defer(() => console.log("Cleanup 2"));
    console.log("Doing work...");
    console.log("Something goes wrong");
    throw new Error("ERROR");
  }
);
```

**Output:**

```
Start
Doing work...
Something goes wrong
Cleanup 1
Cleanup 2
Error in scope: ERROR
```
