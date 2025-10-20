import { describe, expect, it } from "vitest";
import { safeTry } from "./safe-try";
import { jsTypes } from "./test-helpers";

describe(safeTry, () => {
  it("should return val when the sync action succeeds", () => {
    for (const expected of jsTypes) {
      const res = safeTry(() => expected);
      expect(res.val).toBe(expected);
      expect(res.err).toBeUndefined();
    }
  });

  it("should return err when the sync action throws", () => {
    const expectedError = new Error();
    const res = safeTry(() => {
      throw expectedError;
    });
    expect(res.val).toBeUndefined();
    expect(res.err).toBe(expectedError);
  });

  it("should return val when the async action succeeds", async () => {
    for (const expected of jsTypes) {
      const res = await safeTry(async () => expected);
      expect(res.val).toBe(expected);
      expect(res.err).toBeUndefined();
    }
  });

  it("should return err when the async action throws", async () => {
    const expectedError = new Error();
    const res = await safeTry(async () => {
      throw expectedError;
    });
    expect(res.val).toBeUndefined();
    expect(res.err).toBe(expectedError);
  });

  it("should return err when the async action rejects", async () => {
    const expectedError = new Error();
    const res = await safeTry(() => Promise.reject(expectedError));
    expect(res.val).toBeUndefined();
    expect(res.err).toBe(expectedError);
  });
});
