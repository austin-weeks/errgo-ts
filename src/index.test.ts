import { describe, expect, it } from "vitest";
import errgo, { ensureError, propagateError, Result, tryCatch } from "./index";

describe("errgo-ts exports", () => {
  describe("default exports", () => {
    it("should export propagateError", () => {
      expect(errgo.propagateError).toBeDefined();
    });

    it("should export ensureError", () => {
      expect(errgo.ensureError).toBeDefined();
    });

    it("should export tryCatch", () => {
      expect(errgo.tryCatch).toBeDefined();
    });
  });

  it("should export propagateError", () => {
    expect(propagateError).toBeDefined();
  });

  it("should export ensureError", () => {
    expect(ensureError).toBeDefined();
  });

  it("should export tryCatch", () => {
    expect(tryCatch).toBeDefined();
  });

  it("should export Result type", () => {
    const _ = {} as Result<null>;
  });
});
