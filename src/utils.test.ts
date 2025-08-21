import { afterEach, describe, expect, it, vi } from "vitest";
import { jsTypes, nonErrorTypes } from "./test-helpers";
import { ensureError } from "./utils";

describe(ensureError, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return errors unchanged", () => {
    const error = new Error("this is an error", { cause: "some cause" });
    const errorValues = [error.message, error.cause];
    const res = ensureError(error);
    expect(res).toBe(error);
    expect([res.message, res.cause]).toEqual(errorValues);
  });

  it("should return built-in errors unchanged", () => {
    const builtInErrors = [
      new EvalError(),
      new RangeError(),
      new ReferenceError(),
      new SyntaxError(),
      new TypeError(),
      new URIError(),
      new AggregateError([new Error()]),
    ];
    for (const error of builtInErrors) {
      const res = ensureError(error);
      expect(res).toBe(error);
    }
  });

  it("should return error sub-classes unchanged", () => {
    class CustomError extends Error {}
    const error = new CustomError();
    const res = ensureError(error);
    expect(res).toBe(error);
  });

  it("should always return an error", () => {
    for (const value of jsTypes) {
      const res = ensureError(value);
      expect(res).toBeInstanceOf(Error);
    }
  });

  it("should wrap non-error values in a descriptive error", () => {
    const res = ensureError(undefined);
    expect(res.message).toMatch(/^Non-Error object was thrown: undefined$/);
  });

  it("should handle null", () => {
    const res = ensureError(null);
    expect(res.message).toMatch(/: null$/i);
  });

  it("should convert non-null objects to JSON strings", () => {
    for (const obj of nonErrorTypes.filter(
      (t) => t !== null && typeof t === "object"
    )) {
      const res = ensureError(obj);
      const expected = JSON.stringify(obj);
      expect(res.message.endsWith(expected)).toBe(true);
    }
  });

  it("should handle objects with circular references", () => {
    type ObjectWithRef = { ref?: object };
    const obj1: ObjectWithRef = {};
    const obj2: ObjectWithRef = {};
    obj1.ref = obj2;
    obj2.ref = obj1;
    expect(() => ensureError(obj1)).not.toThrowError();
  });

  it("should convert objects to normal strings if JSON stringify fails", () => {
    vi.spyOn(JSON, "stringify").mockImplementation(() => {
      throw new Error();
    });
    const res = ensureError({});
    const expected = "[object Object]";
    expect(res.message.endsWith(expected)).toBe(true);
  });

  it("should convert all other types to string", () => {
    for (const value of jsTypes.filter((t) => typeof t !== "object")) {
      const res = ensureError(value);
      const expected = String(value);
      expect(res.message.endsWith(expected)).toBe(true);
    }
  });

  it("should list the unknown value as the error cause", () => {
    for (const value of nonErrorTypes) {
      const res = ensureError(value);
      expect(res.cause).toBe(value);
    }
  });
});
