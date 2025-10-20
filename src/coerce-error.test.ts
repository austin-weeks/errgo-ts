import { afterEach, describe, expect, it, vi } from "vitest";
import { coerceError } from "./coerce-error";
import { jsTypes, nonErrorTypes } from "./test-helpers";

describe(coerceError, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return errors unchanged", () => {
    const error = new Error("this is an error", { cause: "some cause" });
    const errorValues = [error.message, error.cause];
    const res = coerceError(error);
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
      const res = coerceError(error);
      expect(res).toBe(error);
    }
  });

  it("should return error sub-classes unchanged", () => {
    class CustomError extends Error {}
    const error = new CustomError();
    const res = coerceError(error);
    expect(res).toBe(error);
  });

  it("should always return an error", () => {
    for (const value of jsTypes) {
      const res = coerceError(value);
      expect(res).toBeInstanceOf(Error);
    }
  });

  it("should wrap non-error values in a descriptive error", () => {
    const res = coerceError(undefined);
    expect(res.message).toEqual("undefined");
  });

  it("should handle null", () => {
    const res = coerceError(null);
    expect(res.message).toEqual("null");
  });

  it("should convert non-null objects to JSON strings", () => {
    for (const obj of nonErrorTypes.filter(
      (t) => t !== null && typeof t === "object"
    )) {
      const res = coerceError(obj);
      const expected = JSON.stringify(obj);
      expect(res.message).toEqual(expected);
    }
  });

  it("should handle objects with circular references", () => {
    type ObjectWithRef = { ref?: object };
    const obj1: ObjectWithRef = {};
    const obj2: ObjectWithRef = {};
    obj1.ref = obj2;
    obj2.ref = obj1;
    expect(() => coerceError(obj1)).not.toThrowError();
  });

  it("should convert objects to normal strings if JSON stringify fails", () => {
    vi.spyOn(JSON, "stringify").mockImplementation(() => {
      throw new Error();
    });
    const res = coerceError({});
    const expected = "[object Object]";
    expect(res.message).toEqual(expected);
  });

  it("should convert all other types to string", () => {
    for (const value of jsTypes.filter((t) => typeof t !== "object")) {
      const res = coerceError(value);
      const expected = String(value);
      expect(res.message).toEqual(expected);
    }
  });

  it("should list the unknown value as the error cause", () => {
    for (const value of nonErrorTypes) {
      const res = coerceError(value);
      expect(res.cause).toBe(value);
    }
  });
});
