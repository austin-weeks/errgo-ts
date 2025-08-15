import { afterEach, describe, expect, it, Mock, vi } from "vitest";
import {
  errorf,
  handleUnknown,
  propagateError,
  tryCatch,
  withDefer,
} from "./go-like-helpers";
const JavaScriptTypesDictionary = {
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

const jsTypes = Object.values(JavaScriptTypesDictionary);
const nonErrorTypes = jsTypes.filter((t) => !(t instanceof Error));

describe("error helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(handleUnknown, () => {
    it("should return errors unchanged", () => {
      const error = new Error("this is an error");
      const res = handleUnknown(error);
      expect(res).toBe(error);
    });

    it("should always return an error as a value", () => {
      for (const value of jsTypes) {
        const res = handleUnknown(value);
        expect(res).toBeInstanceOf(Error);
      }
    });

    it("should wrap unkown values in a descriptive error", () => {
      const res = handleUnknown(undefined);
      expect(res.message).toMatch(/^Non-Error object was thrown: undefined$/);
    });

    it("should handle null", () => {
      const res = handleUnknown(null);
      expect(res.message).toMatch(/: null$/i);
    });

    it("should convert non-null objects to JSON strings", () => {
      for (const obj of nonErrorTypes.filter(
        (t) => t !== null && typeof t === "object"
      )) {
        const res = handleUnknown(obj);
        const expected = JSON.stringify(obj);
        expect(res.message.endsWith(expected)).toBe(true);
      }
    });

    it("should convert objects to normal strings if JSON stringify fails", () => {
      vi.spyOn(JSON, "stringify").mockImplementation(() => {
        throw new Error();
      });
      const res = handleUnknown({});
      const expected = "[object Object]";
      expect(res.message.endsWith(expected)).toBe(true);
    });

    it("should convert all other types to string", () => {
      for (const value of jsTypes.filter((t) => typeof t !== "object")) {
        const res = handleUnknown(value);
        const expected = String(value);
        expect(res.message.endsWith(expected)).toBe(true);
      }
    });

    it("should list the unknown value as the error cause", () => {
      for (const value of nonErrorTypes) {
        const res = handleUnknown(value);
        expect(res.cause).toBe(value);
      }
    });
  });

  describe(propagateError, () => {
    it("should execute the action callback as if it were normal code block", () => {
      const innerFunction = vi.fn();
      const action = vi.fn(() => {
        innerFunction();
      });
      propagateError("", action);
      expect(action).toHaveBeenCalled();
      expect(innerFunction).toHaveBeenCalled();
    });

    it("should return the action callback's returned value", () => {
      for (const expectedResult of jsTypes) {
        const actual = propagateError(
          "",
          vi.fn(() => expectedResult)
        );
        expect(actual).toBe(expectedResult);
        expect(actual).toEqual(expectedResult);
      }
    });

    it("should catch and re-throw errors with the provided context", () => {
      const thrower = () =>
        propagateError(
          "Error doing thing",
          vi.fn(() => {
            throw new Error("something went wrong");
          })
        );
      expect(thrower).toThrow(/^Error doing thing: something went wrong$/);
    });

    it("should handle non-Error throws", () => {
      for (const thrownValue of nonErrorTypes) {
        const errorContext = "Error doing thing";
        const thrower = () =>
          propagateError(
            errorContext,
            vi.fn(() => {
              throw thrownValue;
            })
          );
        const expected = `${errorContext}: ${handleUnknown(thrownValue).message}`;
        expect(thrower).toThrow(expected);
      }
    });

    it("should be aliased as errorf", () => {
      expect(errorf).toBe(propagateError);
    });
  });

  describe(tryCatch, () => {
    it("should return [val, null] when the callback succeeds", () => {
      for (const expected of jsTypes) {
        const result = tryCatch(() => expected);
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(2);
        const [val, err] = result;
        expect(val).toBe(expected);
        expect(err).toBeNull();
      }
    });

    it("should return [null, err] when the callback throws", () => {
      const expectedError = new Error();
      const [val, err] = tryCatch(() => {
        throw expectedError;
      });
      expect(val).toBeNull();
      expect(err).toBe(expectedError);
    });

    it("should return [val, null] when async callback succeeds", async () => {
      for (const expected of jsTypes) {
        const [val, err] = await tryCatch(async () => expected);
        expect(val).toBe(expected);
        expect(err).toBeNull();
      }
    });

    it("should return [null, err] when async callback throws", async () => {
      const expectedError = new Error();
      const [val, err] = await tryCatch(async () => {
        throw expectedError;
      });
      expect(val).toBeNull();
      expect(err).toBe(expectedError);
    });

    it("should return [null, err] when async callback rejects", async () => {
      const expectedError = new Error();
      const [val, err] = await tryCatch(() => Promise.reject(expectedError));
      expect(val).toBeNull();
      expect(err).toBe(expectedError);
    });

    it("should have negligible overhead with non-trivial workloads", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const workload = 1_000;
      const func = () => {
        let result = 0;
        for (let i = 0; i < workload; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }
        if (Math.random() < 0.5) {
          return workload;
        } else {
          throw new Error();
        }
      };
      const iterations = 1_000;
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        let result;
        try {
          result = func();
        } catch (e) {
          console.error(handleUnknown(e));
        }
        if (result) {
          void result;
        }
      }
      const nativeTime = performance.now() - nativeStart;

      const utilStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const [result, err] = tryCatch(func);
        if (err) {
          console.error(err);
          continue;
        }
        void result;
      }
      const utilTime = performance.now() - utilStart;
      // allow tryCatch to be up to 5% slower
      const leeway = 1.05;
      expect(utilTime).not.toBeGreaterThan(nativeTime * leeway);
    });
  });

  describe(withDefer, () => {
    describe("no onError param", () => {
      it("should return [val, null] when the action succeeds", () => {
        for (const expected of jsTypes) {
          const [val, err] = withDefer(() => expected);
          expect(val).toBe(expected);
          expect(err).toBeNull();
        }
      });

      it("should return [null, err] when the action throws", () => {
        const expectedError = new Error();
        const [val, err] = withDefer((): string => {
          throw expectedError;
        });
        expect(val).toBeNull();
        expect(err).toBe(expectedError);
      });

      it("should return [val, null] when the async action succeeds", async () => {
        for (const expected of jsTypes) {
          const [val, err] = await withDefer(async () => expected);
          expect(val).toBe(expected);
          expect(err).toBeNull();
        }
      });

      // we shouldn't alllow this?
      it("should return [null, err] when the async action throws", async () => {
        const expectedError = new Error();
        const [val, err] = await withDefer(async (): Promise<string> => {
          throw expectedError;
        });
        expect(val).toBeNull();
        expect(err).toBe(expectedError);
      });

      it("should return [null, err] when the async action rejects", async () => {
        const expectedError = new Error();
        const [val, err] = await withDefer(
          (): Promise<string> => Promise.reject(expectedError)
        );
        expect(val).toBeNull();
        expect(err).toBe(expectedError);
      });
    });

    describe("with onError param", () => {
      it("should discard values returned by the action", () => {
        for (const val of jsTypes) {
          const res = withDefer(
            (e) => {},
            (defer) => {
              return val;
            }
          );
          expect(res).toBeUndefined();
        }
      });

      it("should not call onError if the action succeeds", () => {
        const onError = vi.fn();
        withDefer(onError, () => {});
        expect(onError).not.toHaveBeenCalled();
      });

      it("should call onError if the action throws", () => {
        const error = new Error();
        const onError = vi.fn();
        withDefer(onError, () => {
          throw error;
        });
        expect(onError).toHaveBeenCalledWith(error);
      });

      it("should not call onError if the async action succeeds", async () => {
        const onError = vi.fn();
        await withDefer(onError, async () => {});
        expect(onError).not.toHaveBeenCalled();
      });

      it("should call onError if the async action throws", async () => {
        const error = new Error();
        const onError = vi.fn();
        await withDefer(onError, async () => {
          throw error;
        });
        expect(onError).toHaveBeenCalledWith(error);
      });

      it("should call onError if the async action rejects", async () => {
        const error = new Error();
        const onError = vi.fn();
        await withDefer(onError, () => Promise.reject(error));
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    describe("both overloads", () => {
      function getDeferredFns(results: string[]) {
        return [
          vi.fn(() => {
            results.push("defer 1");
          }),
          vi.fn(() => {
            results.push("defer 2");
          }),
          vi.fn(() => {
            results.push("defer 3");
          }),
        ];
      }
      function getAsyncDeferredFns(results: string[]) {
        return [
          vi.fn(async () => {
            results.push("async defer 1");
          }),
          vi.fn(async () => {
            results.push("async defer 2");
          }),
          vi.fn(async () => {
            results.push("async defer 3");
          }),
        ];
      }

      it("should call each sync defer after the action succeeds", () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      });

      // typescript shouldn't allow this because we're not handling the error with onError or a result variable
      it("should call each sync defer after the action throws", () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      });

      // why does await have no impact on this? that's not quite right.
      // why does this pass if we remove the await? that doesn't seem right to me
      it("should call each sync defer after the async action succeeds", async () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call each sync defer after the async action throws", async () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call each sync defer after the async action rejects", async () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return Promise.reject(new Error());
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call each async defer after the action succeeds", () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      });

      it("should call each async defer after the action throws", () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      });

      it("should call each async defer after the async action succeeds", async () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call each async defer after the async action throws", async () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call each async defer after the async action rejects", async () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return Promise.reject(new Error());
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      });

      it("should call sync defers in first-in-first-out order", () => {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
        });
        expect(results[0]).toBe("defer 1");
        expect(results[1]).toBe("defer 2");
        expect(results[2]).toBe("defer 3");
      });

      it("should call async defers in first-in-first-out order", () => {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
        });
        expect(results[0]).toBe("async defer 1");
        expect(results[1]).toBe("async defer 2");
        expect(results[2]).toBe("async defer 3");
      });

      it("should call mixed sync-async defers in first-in-first-out-order", () => {
        const results: string[] = [];
        const syncDeferredFns = getDeferredFns(results);
        const asyncDeferredFns = getAsyncDeferredFns(results);
        const mixedDeferredFns: Mock[] = [];
        for (let i = 0; i < syncDeferredFns.length; i++) {
          mixedDeferredFns.push(syncDeferredFns[i]);
          mixedDeferredFns.push(asyncDeferredFns[i]);
        }
        withDefer((defer) => {
          mixedDeferredFns.forEach((fn) => defer(fn));
        });
        expect(results[0]).toBe("defer 1");
        expect(results[1]).toBe("async defer 1");
        expect(results[2]).toBe("defer 2");
        expect(results[3]).toBe("async defer 2");
        expect(results[4]).toBe("defer 3");
        expect(results[5]).toBe("async defer 3");
      });

      it("should log errors and continue if a sync defer throws", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const throwingFn = vi.fn(() => {
          throw new Error();
        });
        const okayFn = vi.fn();
        withDefer((defer) => {
          defer(throwingFn);
          defer(okayFn);
        });
        expect(console.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Error in deferred callback"),
          })
        );
        expect(okayFn).toHaveBeenCalled();
      });

      it("should log errors and continue if an async defer throws", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const throwingFn = vi.fn(async () => {
          throw new Error();
        });
        const okayFn = vi.fn();
        withDefer((defer) => {
          defer(throwingFn);
          defer(okayFn);
        });

        await new Promise((res) => setTimeout(res, 10));

        expect(console.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Error in async deferred callback"),
          })
        );
        expect(okayFn).toHaveBeenCalled();
      });

      it("should log errors and continue if an async defer rejects", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const rejectingFn = vi.fn(async () => {
          return Promise.reject(new Error());
        });
        const okayFn = vi.fn();
        withDefer((defer) => {
          defer(rejectingFn);
          defer(okayFn);
        });

        await new Promise((res) => setTimeout(res, 10));

        expect(console.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Error in async deferred callback"),
          })
        );
        expect(okayFn).toHaveBeenCalled();
      });
    });

    it("should handle nested defers in the correct order", () => {
      const results: string[] = [];
      const outerDefer = vi.fn(() => {
        results.push("outer defer");
      });
      const outerAction = vi.fn(() => {
        results.push("outer action");
      });
      const innerDefer = vi.fn(() => {
        results.push("inner defer");
      });
      const innerAction = vi.fn(() => {
        results.push("inner action");
      });

      withDefer((defer) => {
        defer(outerDefer);
        withDefer((defer) => {
          defer(innerDefer);
          innerAction();
        });
        outerAction();
      });

      expect(outerDefer).toHaveBeenCalled();
      expect(outerAction).toHaveBeenCalled();
      expect(innerDefer).toHaveBeenCalled();
      expect(innerAction).toHaveBeenCalled();

      expect(results[0]).toBe("inner action");
      expect(results[1]).toBe("inner defer");
      expect(results[2]).toBe("outer action");
      expect(results[3]).toBe("outer defer");
    });

    it("should have negligible overhead ", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      const workload = 1_000;
      const func = () => {
        let result = 0;
        for (let i = 0; i < workload; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }
        if (Math.random() < 0.5) {
          return workload;
        } else {
          throw new Error();
        }
      };
      const iterations = 1_000;

      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        let result;
        try {
          result = func();
        } catch (e) {
          console.error(handleUnknown(e));
        } finally {
          void result;
          console.log("Hello world");
        }
        if (result) {
          console.log(result);
        }
      }
      const nativeTime = performance.now() - nativeStart;

      const utilStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const [res, err] = withDefer((defer) => {
          defer(() => console.log("Hello world"));
          return func();
        });
        if (err) {
          console.error(err);
          continue;
        }
        console.log(res);
      }
      const utilTime = performance.now() - utilStart;
      // Allow up to 5% slower
      const leeway = 1.05;
      expect(utilTime).not.toBeGreaterThan(nativeTime * leeway);
    });
  });
});
