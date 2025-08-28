import { afterEach, describe, expect, it, vi } from "vitest";
import defer from "./defer";
import { jsTypes } from "./test-helpers";
import { tryCatch } from "./try-catch";

describe("defer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  type DeferFn<T> = (
    action: (defer: (fn: () => void) => void) => T | Promise<T>
  ) => void | Promise<void>;
  function allVersions<T>(): DeferFn<T>[] {
    return [
      defer.safe,
      // @ts-expect-error - fanagle
      (fn) => tryCatch(() => defer.throwing(fn)),
      // @ts-expect-error - fanagle
      (fn) => defer.handled(() => {}, fn),
    ] as DeferFn<T>[];
  }

  describe("all versions", () => {
    it("should execute defers in FIFO order", () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        deferFn((defer) => {
          deferredFns.forEach(defer);
        });
        expect(results[0]).toEqual("defer 1");
        expect(results[1]).toEqual("defer 2");
        expect(results[2]).toEqual("defer 3");
      }
    });

    it("should execute defers after the sync action succeeds", () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        deferFn((defer) => {
          deferredFns.forEach(defer);
          results.push("action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toEqual("action");
      }
    });

    it("should execute defers after the sync action throws", () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        deferFn((defer) => {
          deferredFns.forEach(defer);
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toEqual("action");
      }
    });

    it("should execute defers after the async action succeeds", async () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await deferFn(async (defer) => {
          deferredFns.forEach(defer);
          results.push("action");
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toEqual("action");
      }
    });

    it("should execute defers after the async action throws", async () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await deferFn(async (defer) => {
          deferredFns.forEach(defer);
          results.push("action");
          throw new Error();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toEqual("action");
      }
    });

    it("should execute defers after the async action rejects", async () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const deferredFns = getDeferredFns(results);
        await deferFn(async (defer) => {
          deferredFns.forEach(defer);
          results.push("action");
          return Promise.reject();
        });
        deferredFns.forEach((fn) => expect(fn).toHaveBeenCalled());
        expect(results[0]).toEqual("action");
      }
    });

    it("should handled nested defers", () => {
      for (const deferFn of allVersions()) {
        const results: string[] = [];
        const outerDefer = vi.fn(() => results.push("outer defer"));
        const outerAction = vi.fn(() => results.push("outer action"));
        const innerDefer = vi.fn(() => results.push("inner defer"));
        const innerAction = vi.fn(() => results.push("inner action"));
        deferFn((defer) => {
          defer(outerDefer);
          deferFn((defer) => {
            defer(innerDefer);
            innerAction();
          });
          outerAction();
        });
        expect(results[0]).toEqual("inner action");
        expect(results[1]).toEqual("inner defer");
        expect(results[2]).toEqual("outer action");
        expect(results[3]).toEqual("outer defer");
      }
    });

    it("should log a warning if a defer throws", () => {
      for (const deferFn of allVersions()) {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = new Error();
        deferFn((defer) => {
          defer(() => {
            throw error;
          });
        });
        expect(console.warn).toHaveBeenCalledWith(
          "Error in deferred callback:",
          error
        );
      }
    });

    it("should execute all defers even if a defer throws", () => {
      for (const deferFn of allVersions()) {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = new Error();
        const defer1 = vi.fn();
        const defer2 = vi.fn();
        deferFn((defer) => {
          defer(defer1);
          defer(() => {
            throw error;
          });
          defer(defer2);
        });
        expect(defer1).toHaveBeenCalled();
        expect(defer2).toHaveBeenCalled();
      }
    });
  });

  describe("defer.safe", () => {
    it("should return val result if the sync action succeeds", () => {
      for (const expected of jsTypes) {
        const res = defer.safe(() => expected);
        expect(res.val).toBe(expected);
      }
    });

    it("should return err result if the sync action throws", () => {
      const error = new Error();
      const res = defer.safe(() => {
        throw error;
      });
      expect(res.err).toBe(error);
    });

    it("should return val result if the async action succeeds", async () => {
      for (const expected of jsTypes) {
        const res = await defer.safe(async () => expected);
        expect(res.val).toBe(expected);
      }
    });

    it("should return err result if the async action throws", async () => {
      const error = new Error();
      const res = await defer.safe(async () => {
        throw error;
      });
      expect(res.err).toBe(error);
    });

    it("should return err result if the async action rejects", async () => {
      const error = new Error();
      const res = await defer.safe(() => Promise.reject(error));
      expect(res.err).toBe(error);
    });
  });

  describe("defer.throwing", () => {
    it("should return val if the sync action succeeds", () => {
      for (const expected of jsTypes) {
        expect(defer.throwing(() => expected)).toBe(expected);
      }
    });

    it("should throw if the sync action throws", () => {
      const error = new Error();
      const res = tryCatch(() =>
        defer.throwing(() => {
          throw error;
        })
      );
      expect(res.err).toBe(error);
    });

    it("should return val if the async action succeeds", async () => {
      for (const expected of jsTypes) {
        expect(await defer.throwing(async () => expected)).toBe(expected);
      }
    });

    it("should throw if the async action throws", async () => {
      const error = new Error();
      const res = await tryCatch(() =>
        defer.throwing(async () => {
          throw error;
        })
      );
      expect(res.err).toBe(error);
    });

    it("should throw if the async action rejects", async () => {
      const error = new Error();
      const res = await tryCatch(() => defer.throwing(() => Promise.reject(error)));
      expect(res.err).toBe(error);
    });
  });

  describe("defer.handled", () => {
    it("should not call onError if the sync action succeeds", () => {
      const onError = vi.fn();
      defer.handled(onError, () => {});
      expect(onError).not.toHaveBeenCalled();
    });

    it("should call onError if the sync action throws", () => {
      const error = new Error();
      const onError = vi.fn();
      defer.handled(onError, () => {
        throw error;
      });
      expect(onError).toHaveBeenCalledWith(error);
    });

    // why this not work?
    it("should not call onError if the async action succeeds", async () => {
      const onError = vi.fn();
      await defer.handled(onError, async () => {});
      expect(onError).not.toHaveBeenCalled();
    });

    it("should call onError if the async action throws", async () => {
      const error = new Error();
      const onError = vi.fn();
      await defer.handled(onError, async () => {
        throw error;
      });
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should call onError if the async action rejects", async () => {
      const error = new Error();
      const onError = vi.fn();
      await defer.handled(onError, () => Promise.reject(error));
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
