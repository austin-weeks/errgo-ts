import { describe, expect, it, vi } from "vitest";
import { jsTypes } from "./test-helpers";
import { tryCatch } from "./try-catch";
import { ensureError } from "./utils";

describe(tryCatch, () => {
  it("should return [val, null] when the sync action succeeds", () => {
    for (const expected of jsTypes) {
      const result = tryCatch(() => expected);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      const [val, err] = result;
      expect(val).toBe(expected);
      expect(err).toBeNull();
    }
  });

  it("should return [null, err] when the sync action throws", () => {
    const expectedError = new Error();
    const [val, err] = tryCatch(() => {
      throw expectedError;
    });
    expect(val).toBeNull();
    expect(err).toBe(expectedError);
  });

  it("should return [val, null] when the async action succeeds", async () => {
    for (const expected of jsTypes) {
      const [val, err] = await tryCatch(async () => expected);
      expect(val).toBe(expected);
      expect(err).toBeNull();
    }
  });

  it("should return [null, err] when the async action throws", async () => {
    const expectedError = new Error();
    const [val, err] = await tryCatch(async () => {
      throw expectedError;
    });
    expect(val).toBeNull();
    expect(err).toBe(expectedError);
  });

  it("should return [null, err] when the async action rejects", async () => {
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
        return result;
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
        console.error(ensureError(e));
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
