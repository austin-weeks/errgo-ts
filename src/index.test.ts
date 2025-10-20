import { describe, expect, it } from "vitest";
import { coerceError, propagateError, Result, scope, tryCatch } from "./index";

describe("errgo-ts exports", () => {
  it("should export propagateError", () => {
    expect(propagateError).toBeDefined();
  });

  it("should export coerceError", () => {
    expect(coerceError).toBeDefined();
  });

  it("should export tryCatch", () => {
    expect(tryCatch).toBeDefined();
  });

  it("should export Result type", () => {
    const _: Result<null> = { val: null };
  });

  it("should export scope.safe", () => {
    expect(scope.safe).toBeDefined();
  });

  it("should export scope.throwing", () => {
    expect(scope.throwing).toBeDefined();
  });

  it("should export scope.handled", () => {
    expect(scope.handled).toBeDefined();
  });
});
