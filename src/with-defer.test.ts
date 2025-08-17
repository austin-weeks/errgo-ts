import { describe, expect, it, vi, type Mock } from "vitest";
import { jsTypes } from "./test-helpers";
import { handleUnknown } from "./utils";
import { withDefer } from "./with-defer";

describe(withDefer, () => {
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
  describe("base version", () => {
    it("should return [val, null] when the action succeeds", () => {
      for (const expected of jsTypes) {
        const [val, err] = withDefer(() => expected as any);
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
        const [val, err] = await withDefer(async () => expected as any);
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

  describe(".handled", () => {
    it("should discard values returned by the action", () => {
      for (const val of jsTypes) {
        const res = withDefer.handled(
          (_e) => {},
          (_defer) => val as any
        );
        expect(res).toBeUndefined();
      }
    });

    it("should not call onError if the action succeeds", () => {
      const onError = vi.fn();
      withDefer.handled(onError, () => {});
      expect(onError).not.toHaveBeenCalled();
    });

    it("should call onError if the action throws", () => {
      const error = new Error();
      const onError = vi.fn();
      withDefer.handled(onError, () => {
        throw error;
      });
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should not call onError if the async action succeeds", async () => {
      const onError = vi.fn();
      await withDefer.handled(onError, async () => {});
      expect(onError).not.toHaveBeenCalled();
    });

    it("should call onError if the async action throws", async () => {
      const error = new Error();
      const onError = vi.fn();
      await withDefer.handled(onError, async () => {
        throw error;
      });
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should call onError if the async action rejects", async () => {
      const error = new Error();
      const onError = vi.fn();
      await withDefer.handled(onError, () => Promise.reject(error));
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("both versions", () => {
    it("should call each sync defer after the action succeeds", () => {
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          return 0;
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer.handled(
          (_e) => {},
          (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("action");
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
    });

    it("should call each sync defer after the action throws", () => {
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        withDefer.handled(
          (_e) => {},
          (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("action");
            throw new Error();
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
    });

    it("should call each sync defer after the async action succeeds", async () => {
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return 0;
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });

    it("should call each sync defer after the async action throws", async () => {
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
            throw new Error();
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });

    it("should call each sync defer after the async action rejects", async () => {
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return Promise.reject(new Error());
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
            return Promise.reject(new Error());
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });

    it("should call each async defer after the action succeeds", () => {
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          return 0;
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer.handled(
          (_e) => {},
          (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("action");
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
    });

    it("should call each async defer after the action throws", () => {
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer((defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        withDefer.handled(
          (_e) => {},
          (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("action");
            throw new Error();
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("action");
      }
    });

    it("should call each async defer after the async action succeeds", async () => {
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return 0;
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });

    it("should call each async defer after the async action throws", async () => {
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
            throw new Error();
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });

    it("should call each async defer after the async action rejects", async () => {
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer(async (defer) => {
          deferredFns.forEach((fn) => defer(fn));
          results.push("async action");
          return Promise.reject(new Error());
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
      {
        const results: string[] = [];
        const deferredFns = getAsyncDeferredFns(results);
        await withDefer.handled(
          (_e) => {},
          async (defer) => {
            deferredFns.forEach((fn) => defer(fn));
            results.push("async action");
            return Promise.reject(new Error());
          }
        );
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toBe("async action");
      }
    });
  });

  describe("defer queue resolution", () => {
    it("should call sync defers in first-in-first-out order", () => {
      const results: string[] = [];
      const deferredFns = getDeferredFns(results);
      withDefer((defer) => {
        deferredFns.forEach((fn) => defer(fn));
        return 0;
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
        return 0;
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
        return 0;
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
        return 0;
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
        return 0;
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
        return 0;
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
        return 0;
      });
      outerAction();
      return 0;
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
    // Allow up to 10% slower
    const leeway = 1.1;
    expect(utilTime).not.toBeGreaterThan(nativeTime * leeway);
  });
});
