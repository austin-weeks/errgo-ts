[![Package Version](https://img.shields.io/npm/v/errgo-ts?logo=npm)](https://www.npmjs.org/package/errgo-ts)
![Bundle Size](https://img.shields.io/bundlephobia/min/errgo-ts)
![GitHub License](https://img.shields.io/github/license/austin-weeks/errgo-ts)
![Package Downloads](https://img.shields.io/npm/dm/errgo-ts)
![Code Coverage](https://img.shields.io/badge/coverage-100%25-dark_green)
[![Tests](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml/badge.svg)](https://github.com/austin-weeks/errgo-ts/actions/workflows/Tests.yaml)

_Forgo your error woes with errgo's ergonomic error handling!_

# `errgo-ts`

A lightweight TypeScript library for ergonomic error handling, inspired by Go and Rust.

Offers [error handling utilities](#error-handling-utilities), a [`Result`](#result-type) type, and an equivalent to the [`defer` keyword from Go](#scope---execute-functions-with-deferred-actions).

## Installation

Add the library as a dependency with your preferred package manager:

```sh
pnpm add errgo-ts

npm install errgo-ts

bun add errgo-ts
```

## Why would I use this?

_You're fed up with JavaScript's error handling patterns and have written **this** too many times to count:_

```typescript
let data;
//    ^ `data` must be declared outside the try/catch - but now it's mutable!
try {
  data = somethingThatCouldFail();
} catch (e: unknown) {
  //     ^ we have no way of knowing the type of `e`
  console.error("Couldn't do it:", e);
}
doSomethingWithData(data);
```

## Why wouldn't I use this?

_You want to entirely avoid `try/catch` blocks and native JavaScript error handling._ If that's your goal, try something like [`neverthrow`](https://github.com/supermacro/neverthrow).

_Your application needs maximum performance._ There is a small amount of overhead with most of `errgo-ts`'s functions, namely the allocation of closures. That said, it's JavaScript. If you're that concerned about performance, you should probably be using a different language.

## API

- [`safeTry`](#safetry---errors-as-values-trycatch-wrapper) - a try/catch replacement
- [`Result<T, E>`](#result-type) - success or failure type
- [`coerceError`](#coerceerror---no-more-unknown-catches) - type-safe catches
- [`propagateError`](#propagateerror---declarative-error-propagation) - declarative error propagation
- [`scope`](#scope---execute-functions-with-deferred-actions) - deterministic scopes with `defer`
  - [`scope.safe`](#scopesafe---returns-a-result-object)
  - [`scope.throwing`](#scopethrowing---re-throws-errors)
  - [`scope.handled`](#scopehandled---calls-a-provided-error-handler)

## Error Handling Utilities

### `safeTry` - Errors-as-values try/catch wrapper

Execute a function safely and operate on the result instead of throwing and catching errors. The same helper works seamlessly with both sync and async functions.

**Sync Usage:**

```typescript
import { safeTry } from "errgo-ts";

const res = safeTry(() => thisMightThrow());
if (res.err) {
  console.error("It failed:", res.err);
  return;
}
doSomethingElse(res.val);
```

**Async Usage:**

```typescript
import { safeTry } from "errgo-ts";

const usersRes = await safeTry(() => fetch("/api/users").then((r) => r.json()));
if (usersRes.err) {
  displayErrorMsg("Failed to fetch users");
  return;
}
doSomethingWithUsers(usersRes.val);
```

### `coerceError` - No more unknown catches

Converts an object of an unknown type to an `Error` instance. Handles all the weird ways JavaScript allows throwing non-error objects.

```typescript
import { coerceError } from "errgo-ts";

try {
  throw "i'm throwing a string! (for some reason)";
} catch (e: unknown) {
  const error = coerceError(e);
  console.assert(error instanceof Error);
}
```

_`safeTry`, `scope` variations, and `propagateError` all use this function under the hood!_

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

A type representing either success or failure. `Result` objects can contain `val` or `err`, but never both.

```typescript
type Result<T, E = Error> =
  | { val: T; err?: undefined }
  | { err: E; val?: undefined };
```

```typescript
import { type Result } from "errgo-ts";

const success: Result<number> = { val: 2 };
const failure: Result<number, MyCustomError> = { err: new MyCustomError() };
```

_`errgo-ts`'s `Result` is a little bit like Go's `(T, error)` tuple, and a little bit like Rust's `Result` enum, but also not really quite either._

## `scope` - Execute functions with deferred actions

`scope` introduces an equivalent to Go's `defer` keyword. This allows you to defer code execution until the completion of the scope.

```typescript
import { scope } from "errgo-ts";

scope.safe((defer) => {
  const conn = new Connection();
  defer(() => conn.close());

  conn.send("Hello!");
});
```

`scope` provides three variations for flexible error handling:

### `scope.safe` - Returns a Result object

Returns a `Result` object. **Never throws**. In most cases, you should use this variation.

```typescript
import { scope } from "errgo-ts";

const res = scope.safe((defer) => {
  console.log("Start");
  defer(() => console.log("Cleanup"));
  console.log("Doing work...");
  return "OK";
});
if (!res.err) {
  console.log("Result:", res.val);
}
```

**Output:**

```text
Start
Doing work...
Cleanup
Result: OK
```

### `scope.throwing` - Re-throws errors

Returns the executed function's value and re-throws any errors.

```typescript
try {
  const data = scope.throwing((defer) => {
    console.log("Start");
    defer(() => console.log("Cleanup"));
    console.log("Doing work...");
    throw new Error("uh oh!");
  });
  console.log("Data:", data);
} catch (e) {
  console.error("Caught:", e);
}
```

**Output:**

```text
Start
Doing work...
Cleanup
Caught: uh oh!
```

### `scope.handled` - Calls a provided error handler

Executes a callback on error. Allows for declarative error handling when the scope returns no value.

```typescript
scope.handled(
  (err) => console.error("Error in scope:", err),
  (defer) => {
    console.log("Start");
    defer(() => console.log("Cleanup"));
    console.log("Doing work...");
    throw new Error("uh oh!");
  }
);
```

**Output:**

```text
Start
Doing work...
Cleanup
Error in scope: uh oh!
```
