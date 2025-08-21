import { describe, expect, test, vi } from "vitest";
import { propagateError } from "./propagate-error";
import { jsTypes } from "./test-helpers";

describe(propagateError, () => {
  describe("should execute the action as if it were a code block", () => {
    test("when passed a sync action", () => {
      const innerFunction = vi.fn();
      const action = vi.fn(() => {
        innerFunction();
      });
      propagateError("", action);
      expect(action).toHaveBeenCalled();
      expect(innerFunction).toHaveBeenCalled();
    });

    test("when passed an async action", async () => {
      const innerFunction = vi.fn(async () => {});
      const action = vi.fn(async () => {
        await innerFunction();
      });
      await propagateError("", action);
      expect(action).toHaveBeenCalled();
      expect(innerFunction).toHaveBeenCalled();
    });
  });

  describe("should return the action's returned value", () => {
    test("when passed a sync action", () => {
      for (const expected of jsTypes) {
        const actual = propagateError("", () => expected);
        expect(actual).toBe(expected);
        expect(actual).toStrictEqual(expected);
      }
    });

    test("when passed an async action", async () => {
      for (const expected of jsTypes) {
        const actual = await propagateError("", async () => expected);
        expect(actual).toBe(expected);
        expect(actual).toStrictEqual(expected);
      }
    });
  });

  describe("should catch errors and re-throw them wrapped in the provided context", () => {
    test("when passed a sync action that throws", () => {
      const actionError = new Error("something went wrong");
      const errorContext = "Error doing thing";

      let thrownError: Error | undefined;
      try {
        propagateError(errorContext, () => {
          throw actionError;
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        thrownError = error as Error;
      }
      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toEqual(errorContext);
      expect(thrownError?.cause).toBe(actionError);
    });

    test("when passed an async action that throws", async () => {
      const actionError = new Error("something went wrong");
      const errorContext = "Error doing thing";

      let thrownError: Error | undefined;
      try {
        await propagateError(errorContext, async () => {
          throw actionError;
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        thrownError = error as Error;
      }
      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toEqual(errorContext);
      expect(thrownError?.cause).toBe(actionError);
    });

    test("when passed an async action that rejects", async () => {
      const actionError = new Error("something went wrong");
      const errorContext = "Error doing thing";

      let thrownError: Error | undefined;
      try {
        await propagateError(errorContext, () => {
          return Promise.reject(actionError);
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        thrownError = error as Error;
      }
      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toEqual(errorContext);
      expect(thrownError?.cause).toBe(actionError);
    });
  });
});
